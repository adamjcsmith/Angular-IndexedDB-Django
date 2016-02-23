'use strict';

angular.module('angularTestTwo').service('offlineDB', function($http) {

    var view_model = this;

    // Parameters
    view_model.autoSync = 0; /* Set to zero for no auto synchronisation */
    view_model.pushSync = false;
    view_model.initialSync = true;
    view_model.allowIndexedDB = true; /* Switching to false disables IndexedDB */
    view_model.allowRemote = true;
    view_model.updateAPI = "/angularexample/updateElements/";
    view_model.createAPI = "/angularexample/createElements/";
    view_model.readAPI = "/angularexample/getElements/?after=";

    // Service Variables
    view_model.idb = null;
    view_model.serviceDB = []; /* Local image of the data */
    view_model.observerCallbacks = [];
    view_model.lastChecked = new Date("1970-01-01T00:00:00.413Z").toISOString(); /* Initially the epoch */

    // Public Functions
    view_model.registerController = registerController;
    view_model.generateTimestamp = generateTimestamp;
    view_model.newSyncThree = newSyncThree;
    view_model.objectUpdate = objectUpdate;

    // Determine IndexedDB Support
    view_model.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
    if(!view_model.allowIndexedDB) view_model.indexedDB = null;

    function objectUpdate(obj) {
      if(obj.hasOwnProperty("syncState")) {
        if(obj.syncState > 0) { obj.syncState = 2; }
      } else {
        obj = _.cloneDeep(_stripAngularHashKeys(obj));
        obj.syncState = 0;
        obj.pk = _generateUUID();
      }
      _patchLocal(_stripAngularHashKeys([obj]), function(response) {
        if(view_model.pushSync) newSyncThree(_notifyObservers);
      });
     };

     /* --------------- Observer Pattern --------------- */

    function registerController(ctrlCallback) {
      if(view_model.idb == null) {
        _establishIndexedDB(function() {
          view_model.observerCallbacks.push(ctrlCallback);
          if(!view_model.initialSync) return;
          view_model.newSyncThree(function(response) {
            ctrlCallback(response);
          });
        });
      } else {
        view_model.observerCallbacks.push(ctrlCallback);
        if(!view_model.initialSync) return;
        view_model.newSyncThree(function(response) {
          ctrlCallback(response);
        });
       }
     };

    /* --------------- Synchronisation --------------- */

    function newSyncThree(callback) {
      var newLocalRecords = _getLocalRecords(view_model.lastChecked);
      // A. Load previous data on the first sync:
      if( newLocalRecords.length == 0 && view_model.serviceDB.length == 0 ) {
        _restoreLocalState( function(localResponse) {
          _patchRemoteChanges(function(remoteResponse) {
            _reduceQueue(function(queueResponse) {
              callback(localResponse + " " + remoteResponse + " " + queueResponse);
            });
          });
        });
      } else {
        _patchRemoteChanges(function(remoteResponse) {
          _reduceQueue(function(queueResponse) {
            callback(remoteResponse + " " + queueResponse);
          });
        });
      }
    };

    // Patches remote edits to serviceDB + IndexedDB:
    function _patchRemoteChanges(callback) {
      if(!view_model.allowRemote) { callback("Remote connection disabled."); return; }
      _getRemoteRecords(function(response) {
        if(response.status == 200) {
          _patchLocal(response.data, function(localResponse) {
            callback(localResponse);
          });
        } else { callback("Could not connect to remote server: (" + response.status + ") error."); }
      });
    };

    // Patches the local storages with a dataset.
    function _patchLocal(data, callback) {
      _patchServiceDB(data);
      view_model.lastChecked = generateTimestamp();
      if( _hasIndexedDB() ) {
        _putArrayToIndexedDB(data, function() {
          callback("Patched records to ServiceDB & IndexedDB.");
        });
      } else {
        callback("Patched records to ServiceDB only.");
      }
    };

    function __notifyObservers() {
      angular.forEach(view_model.observerCallbacks, function(callback){
        callback();
      });
    };

    /* --------------- IndexedDB logic --------------- */

    function _restoreLocalState(callback) {
      if(!_hasIndexedDB()) { callback("IndexedDB not supported."); return; }
      _getIndexedDB(function(idbRecords) {

        var sortedElements = _.reverse(_.sortBy(idbRecords, function(o) {
          return new Date(o.fields.timestamp).toISOString();
        }));
        var nonQueueElements = _.filter(sortedElements, {syncState: 1});
        var queueElements = _.filter(sortedElements, function(o) { return o.syncState != 1; });

        if(nonQueueElements.length > 0) {
          view_model.lastChecked = sortedElements[0].fields.timestamp;
        }
        else {
          if(queueElements.length > 0)
            view_model.lastChecked = queueElements[queueElements.length - 1].fields.timestamp;
        }

        _patchServiceDB(idbRecords);
        callback(idbRecords.length + " record(s) taken from IndexedDB.");

      });
    };

    function _reduceQueue(callback) {
      if(!view_model.allowRemote) { callback("As remote is disabled, the queue cannot be cleared."); return; }

      var createQueue = _.filter(view_model.serviceDB, { "syncState" : 0 });
      var updateQueue = _.filter(view_model.serviceDB, { "syncState" : 2 });

      // Get rid of the create queue:
      _safeArrayPost(createQueue, view_model.createAPI, function(successfulCreates) {
        _safeArrayPost(updateQueue, view_model.updateAPI, function(successfulUpdates) {

          var totalQueue = successfulCreates.concat(successfulUpdates);
          _.forEach(totalQueue, function(value) {
            value.fields.timestamp = generateTimestamp();
          });

          _patchLocal(_resetSyncState(totalQueue), function(response) {

            var queueLength = updateQueue.length + createQueue.length;
            var popLength = successfulCreates.length + successfulUpdates.length;

            // Check here for integrity:
            if( queueLength == popLength ) {
              callback("All queue items have been synchronised.");
            } else {
              callback( (queueLength - popLength) + " items could not be synchronised.");
            }

          });
        });
      });

    };

    /* --------------- ServiceDB Interface --------------- */

    function _patchServiceDB(data) {
      var operations = _filterOperations(data);
      _updatesToServiceDB(operations.updateOperations);
      _pushToServiceDB(operations.createOperations);
    };

    function _pushToServiceDB(array) {
      for(var i=0; i<array.length; i++) view_model.serviceDB.push(array[i]);
    };

    function _updatesToServiceDB(array) {
      for(var i=0; i<array.length; i++) {
        var matchID = _.findIndex(view_model.serviceDB, {"pk" : array[i].pk });
        if(matchID > -1) view_model.serviceDB[matchID] = array[i];
      }
    };

    function _getLocalRecords(sinceTime) {
      return _.filter(view_model.serviceDB, function(o) {
        return new Date(o.fields.timestamp).toISOString() > sinceTime;
      });
    };

    /* --------------- Data Handling --------------- */

    /* Filter remote data into create or update operations */
    function _filterOperations(data) {
      var updateOps = [];
      var createOps = [];
      for(var i=0; i<data.length; i++) {
        var query = _.findIndex(view_model.serviceDB, {'pk' : data[i].pk });
        if( query > -1 ) updateOps.push(data[i]);
        else createOps.push(data[i]);
      }
      return { updateOperations: updateOps, createOperations: createOps };
    }

    function _resetSyncState(records) {
      for(var i=0; i<records.length; i++) {
        records[i].syncState = 1;
      }
      return records;
    };

    /* --------------- Remote --------------- */

    function _postRemote(data, url, callback) {
      // Data should be a single record.
      $http({
          url: url,
          method: "POST",
          data: [data],
          headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
      })
      .then(
        function successCallback(response) {
          callback(response.status); // return response code.
        }, function errorCallback(response) {
          callback(response.status);
        });
    };

    function _getRemoteRecords(callback) {
      $http({
          method: 'GET',
          url: view_model.readAPI + view_model.lastChecked
        })
        .then(
          function successCallback(response) {
            if(response.data.length > 0)
              callback({data: _resetSyncState(response.data), status: 200});
            else
              callback({data: [], status: 200});

        }, function errorCallback(response) {
            callback({data: [], status: response.status});
        });
    };

    // Tries to post an array one-by-one; returns successful elements.
    function _safeArrayPost(array, url, callback) {
      var x = 0;
      var successfulElements = [];
      if(array.length == 0) { callback([]); return; }
      function loopArray(array) {
        _postRemote(array[x],url,function(response) {
          if(response == 200) successfulElements.push(array[x]);
          x++;
          if(x < array.length) { loopArray(array); }
          else { callback(successfulElements); }
        });
      };
      loopArray(array);
    };

    /* --------------- IndexedDB --------------- */

    function _establishIndexedDB(callback) {
      if(!_hasIndexedDB()) { callback(); /* No browser support for IDB */ return; }
      var request = view_model.indexedDB.open('localDB', 135);
      request.onupgradeneeded = function(e) {
        var db = e.target.result;
        e.target.transaction.onerror = function() { console.error(this.error); };
        if(db.objectStoreNames.contains('offlineItems')) {
          db.deleteObjectStore('offlineItems');
        }
        var offlineItems = db.createObjectStore('offlineItems', { keyPath: 'pk', autoIncrement: false } );
        var dateIndex = offlineItems.createIndex("byDate", "fields.timestamp", {unique: false});
        view_model.idb = db;
      };
      request.onsuccess = function(e) {
        view_model.idb = e.target.result;
        callback();
      };
      request.onerror = function() { console.error(this.error); };
    };

    function _hasIndexedDB() {
      return !(view_model.indexedDB === undefined || view_model.indexedDB === null );
    };

    // Get from IndexedDB. This function returns appropriate records.
    function _getIndexedDB(callback) {
      var transaction = _newIDBTransaction();
      var objStore = transaction.objectStore('offlineItems');
      var keyRange = IDBKeyRange.lowerBound(0);
      var cursorRequest = objStore.index('byDate').openCursor(keyRange);
      var returnableItems = [];
      transaction.oncomplete = function(e) { callback(returnableItems); };
      cursorRequest.onsuccess = function(e) {
        var result = e.target.result;
        if (!!result == false) { return; }
        returnableItems.push(result.value);
        result.continue();
      };
      cursorRequest.onerror = function() { console.error("error"); };
    };

    // Apply array of edited objects to IndexedDB.
    function _putArrayToIndexedDB(array, callback) {
      var x = 0;
      if(array.length == 0) {
        callback();
        return;
      }
      function loopArray(array) {
        _putToIndexedDB(array[x],function(){
          x++;
          if(x < array.length) { loopArray(array); }
          else { callback(); }
        });
      };
      loopArray(array);
    };

    // Add/Update to IndexedDB. This function returns nothing.
    function _putToIndexedDB(item, callback) {
        item.remoteSync = false;
        var req = _getObjStore('offlineItems').put(item);
        req.onsuccess = function(e) { callback(); };
        req.onerror = function() { console.error(this.error); };
    };

    function _newIDBTransaction() {
      return view_model.idb.transaction(['offlineItems'], 'readwrite');
    }

    function _getObjStore(name) {
      return _newIDBTransaction().objectStore(name);
    };

    /* --------------- Utilities --------------- */

    function generateTimestamp() {
      var d = new Date();
      return d.toISOString();
    };

    function _generateUUID() {
      var d = new Date().getTime();
      if(window.performance && typeof window.performance.now === "function"){
          d += performance.now(); // use high-precision timer if available
      }
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = (d + Math.random()*16)%16 | 0;
          d = Math.floor(d/16);
          return (c=='x' ? r : (r&0x3|0x8)).toString(16);
      });
      return uuid;
    };

    function _stripAngularHashKeys(array) {
      for(var i=0; i<array.length; i++) delete array[i].$$hashKey;
      return array;
    };

    /* --------------- Sync Loop -------------- */

    if(view_model.autoSync > 0 && parseInt(view_model.autoSync) === view_model.autoSync) {
      (function syncLoop() {
        setTimeout(function() {
          newSyncThree(function() {
            __notifyObservers();
          });
          syncLoop();
        }, view_model.autoSync);
      })();
    }


  });
