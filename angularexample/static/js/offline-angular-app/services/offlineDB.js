'use strict';

angular.module('angularTestTwo').service('offlineDB', function($http) {

    var view_model = this;

    // Parameters
    view_model.autoSync = 0; /* Set to zero for no auto synchronisation */
    view_model.pushSync = false;
    view_model.initialSync = true;
    view_model.updateAPI = "/angularexample/updateElements/";
    view_model.createAPI = "/angularexample/createElements/";

    // Service Variables
    view_model.idb = null;
    view_model.serviceDB = []; /* Local image of the data */
    view_model.observerCallbacks = [];
    view_model.lastChecked = new Date("1970-01-01T00:00:00.413Z").toISOString(); /* Initially the epoch */

    // Public Functions
    view_model.registerController = registerController;
    view_model.addItem = addItem;
    view_model.generateTimestamp = generateTimestamp;
    view_model.updateItem = updateItem;
    view_model.newSyncTwo = newSyncTwo;

    // Determine IndexedDB Support
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

    function addItem(object) {
      object.serverSeen = false;
      console.log("pushing " + JSON.stringify(object) + " to serviceDB");
      _pushToServiceDB([object]);
      if(view_model.pushSync) newSyncTwo(notifyObservers);
      console.log("serviceDB is now: " + JSON.stringify(view_model.serviceDB));
     };

    function updateItem(object) {
      console.log("Updating this record: " + JSON.stringify(object));
      _updatesToServiceDB([object]);
      if(view_model.pushSync) newSyncTwo(notifyObservers);
     };

    function registerController(ctrlCallback) {
      if(view_model.idb == null) {
        establishIndexedDB(function() {
          view_model.observerCallbacks.push(ctrlCallback);
          if(!view_model.initialSync) return;
          view_model.newSyncTwo(function() {
            ctrlCallback();
          });
        });
      } else {
        view_model.observerCallbacks.push(ctrlCallback);
        if(!view_model.initialSync) return;
        view_model.newSyncTwo(function() {
          ctrlCallback();
        });
       }
     };

    function notifyObservers() {
      angular.forEach(view_model.observerCallbacks, function(callback){
        callback();
      });
    };

    function establishIndexedDB(callback) {
      if(!_hasIndexedDB) { callback(); /* No browser support for IDB */ }
      var request = indexedDB.open('localDB', 109);
      request.onupgradeneeded = function(e) {
        var db = e.target.result;
        e.target.transaction.onerror = function() { console.error(this.error); };
        if(db.objectStoreNames.contains('offlineItems')) {
          db.deleteObjectStore('offlineItems');
        }
        db.createObjectStore('offlineItems', { keyPath: 'pk', autoIncrement: false } );
        view_model.idb = db;
      };
      request.onsuccess = function(e) {
        view_model.idb = e.target.result;
        callback();
      };
      request.onerror = function() { console.error(this.error); };
    };


    function newSyncThree(callback) {

      // Populate local records.
      var newLocalRecords = _stripAngularHashKeys(_getLocalRecords(view_model.lastChecked));

      // Sync any unsynchronised IndexedDB records.
      


    };


    function newSyncTwo(callback) {

      // 1. Check if there's new local data:
      var newLocalRecords = _stripAngularHashKeys(_getLocalRecords(view_model.lastChecked));
      // 2. Then check if there's remote data:
      _getRemoteRecords(view_model.lastChecked, function(response) {

        var returnedRecords = response.data;

        // Diagnostics:
        returnedRecords = [];

        if(returnedRecords.length > 0 ) {
            if(newLocalRecords.length > 0) {
              console.log("New remote and local records were detected.");
              var comp = _compareRecords(newLocalRecords, returnedRecords);
              console.log("The comparison was: " + JSON.stringify(comp));
              _patchServiceDB(comp.conflictingRecords); /* Just patch for now */
              _patchServiceDB(comp.safeRemote);
              _patchRemote(comp.safeLocal, function() {
                callback();
              });
            } else {
              console.log("New remote records (only) were detected.");
              _patchServiceDB(returnedRecords);
              view_model.lastChecked = generateTimestamp();
              callback();
            }
        } else {
          // Patch to remote only.

          if(newLocalRecords.length > 0) {

            console.log("New local records were detected.");

            if(response.status == "fail") {
              console.log("No remote connection. Special PUT to IndexedDB");
              _patchToIndexedDB(newLocalRecords, false, function() {
                callback();
              });
            } else {
              console.log("Remote connection available. Standard PUT to IndexedDB");
              _patchRemote(newLocalRecords, function() {
                _patchToIndexedDB(newLocalRecords, true, function() {
                  callback();
                });
              });
            }

          } else {

            console.log("No new local or remote records detected.");

            if(view_model.serviceDB.length == 0) {
              _getIndexedDB(function(IDBRecords) {
                _patchServiceDB(IDBRecords); // Type 3: Retrieval
                callback();
              });
            } else {
              callback(); // Nothing to do.
            }

          }

        }
      });
    };


    function _patchToIndexedDB(records, remoteAssurance, callback) {
      if(remoteAssurance) {
        _putArrayToIndexedDB(records, function() {
          callback();
        });
      } else {
        _putUnsyncedIndexedDB(records, function() {
          callback();
        });
      }
    };

    function _getUnsyncedIndexedDB(callback) {
      // Iterate through records for those with a zero timestamp.
      _getIndexedDB(function(records) {
          // use lodash filter here...
          var unsynced = _.filter(records, function(o) { return o.fields.timestamp == 0;  } );
          callback(unsynced);
      });
    };

    function _putUnsyncedIndexedDB(array, callback) {
      // Alter each record and put as normal in IndexedDB.
      for(var i=0; i<array.length; i++) {
          array[i].fields.timestamp = 0;
      }
      _putArrayToIndexedDB(array, function() {
        callback();
      });
    };

    function _assuredIndexedDBSync(array, callback) {
      for(var i=0; i<array.length; i++) {
        array[i].fields.timestamp = generateTimestamp();
      }
      _putArrayToIndexedDB(array, function() {
        callback();
      });
    };



    function _patchServiceDB(remoteRecords) {
      var operations = _determinePatchOperation(remoteRecords);
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



    /* Compare local updates with server updates */
    function _compareRecords(localNew, remoteNew) {
      var conflictingRecords = [];
      var safeRemote = remoteNew;
      var safeLocal = [];
      for(var i=0; i<localNew.length; i++) {
        var matchID = _.findIndex(safeRemote, ['pk', localNew[i].pk]);
        if(matchID > -1) {
          conflictingRecords.push(safeRemote[matchID]);
          safeRemote.splice(matchID, 1);
        }
        else { safeLocal.push(localNew[i]); }
      }
      return { safeLocal: safeLocal, safeRemote: safeRemote, conflictingRecords: conflictingRecords };
    };

    /* Filter remote operations into create and update/delete */
    function _determinePatchOperation(safeLocal) {
      var updateOps = [];
      var createOps = [];
      //safeLocal = _.cloneDeep(safeLocal);
      // This is a shallow copy: changing the pk here also affects serviceDB.
      for(var i=0; i<safeLocal.length; i++) {
        if(!safeLocal[i].pk) {
          safeLocal[i].pk = _generateUUID();
          createOps.push(safeLocal[i]);
          continue;
        }
        var query = _.findIndex(view_model.serviceDB, {'pk' : safeLocal[i].pk });
        if(query > -1 ) updateOps.push(safeLocal[i]);
        else createOps.push(safeLocal[i]);
      }
      return { updateOperations: updateOps, createOperations: createOps };
    };


    /* --------------- Remote (Private) --------------- */

    // Specify that this data set has been seen by the server before.
    function _serverSeenData(records) {
      for(var i=0; i<records.length; i++) {
        records[i].serverSeen = true;
      }
      return records;
    };

    function _patchRemote(records, callback) {
      var ops = _determinePatchOperation(records);

      if(_hasIndexedDB) {

        /*
        _patchToIndexedDB(ops.createOperations.concat(ops.updateOperations), false, function() {
          // Now that all the synced methods are in the IndexedDB,
          // Get all of them and try to sync to
        });
        */

      } else {
        // Original method:
        _postArrayToRemote(view_model.createAPI, ops.createOperations, function() {
          _postArrayToRemote(view_model.updateAPI, ops.updateOperations, function() {
            view_model.lastChecked = generateTimestamp();
            callback();
          });
        });
      }

    };

    function _getRemoteRecords(lastTimestamp, callback) {
      $http({
          method: 'GET',
          url: '/angularexample/getElements/?after=' + lastTimestamp
        })
        .then(
          function successCallback(response) {
            if(response.data.length > 0) callback({data: _serverSeenData(response.data), status: "success"});
            else callback({data: [], status: "success"});
        }, function errorCallback(response) {
          callback({data: [], status: "fail"}); /* Return blank array */
        });
    };

    // Attempts to post data to a URL.
    function _postArrayToRemote(url, array, callback) {
      $http({
          url: url,
          method: "POST",
          data: array,
          headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
      })
      .then(function(response) { callback(true); },
          function(response) { callback(false); }
      );
    };

    /* --------------- IndexedDB (Private) --------------- */

    function _hasIndexedDB() {
      return !(indexedDB == 'undefined' || indexedDB == null);
    };

    // Get from IndexedDB. This function returns appropriate records.
    function _getIndexedDB(callback) {
      var transaction = _newIDBTransaction();
      var objStore = transaction.objectStore('offlineItems');
      var keyRange = IDBKeyRange.lowerBound(0);
      var cursorRequest = objStore.openCursor(keyRange);
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

    // Get individual record from IndexedDB by an ID.
    function _getFromIndexedDB(id, callback) {
        var req = _getObjStore('offlineItems').get(id);
        req.onsuccess = function(e) { callback(true); }
        req.onerror = function() { callback(false); }
    };

    // Apply array of edited objects to IndexedDB.
    function _putArrayToIndexedDB(array, callback) {
      var x = 0;
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

    // Delete from IndexedDB. This function returns nothing.
    function _removeFromIndexedDB(id, callback) {
      var req = _getObjStore('offlineItems').delete(id);
      req.onsucess = function(e) { callback(); }
      req.onerror = function() { console.error(this.error); };
    };

    // Wipe an IndexedDB object store. This function returns nothing.
    function _clearObjStore(callback) {
      var objStore = _getObjStore('offlineItems');
      var req = objStore.clear();
      req.onsuccess = function(e) { callback(objStore.getAll()); }
      req.onerror = function() { console.error(this.error); };
    };

    function _newIDBTransaction() {
      return view_model.idb.transaction(['offlineItems'], 'readwrite');
    }

    function _getObjStore(name) {
      return _newIDBTransaction().objectStore(name);
    };

    /* --------------- Utilities --------------- */

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

    function generateTimestamp() {
      var d = new Date();
      return d.toISOString();
    };

    function _stripAngularHashKeys(array) {
      for(var i=0; i<array.length; i++) delete array[i].$$hashKey;
      return array;
    };

    /* --------------- Sync Loop -------------- */

    if(view_model.autoSync > 0 && parseInt(view_model.autoSync) === view_model.autoSync) {
      (function syncLoop() {
        setTimeout(function() {
          newSyncTwo(function() {
            notifyObservers();
          });
          syncLoop();
        }, view_model.autoSync);
      })();
    }


  });
