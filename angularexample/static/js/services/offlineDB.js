'use strict';

angular.module('angularTestTwo')
  .service('offlineDB', function($http) {

    var view_model = this;
    view_model.datastore = null;
    view_model.openDB = openDB;
    view_model.fetchData = fetchData;
    view_model.clearDB = clearDB;
    view_model.lastCheckedRemote = "1970-01-01T00:00:00.413Z";
    view_model.serviceDB = []; /* Local image of the data */

    view_model.refreshData = refreshData;

    function clearDB(callback) { callback({}); }

    function openDB(callback) {
      var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
      if(!_checkIndexedDB) { callback(); /* User's browser has no support for IndexedDB... */ }

      var request = indexedDB.open('localDB', 105);
      var upgradeRequired = false;

      request.onupgradeneeded = function(e) {
        var upgradeRequired = true;
        var db = e.target.result;
        e.target.transaction.onerror = function() { console.error(this.error); };
        if(db.objectStoreNames.contains('offlineItems')) {
          db.deleteObjectStore('offlineItems');
        }
        db.createObjectStore('offlineItems', { keyPath: 'pk', autoIncrement: false } );
        view_model.datastore = db;
      };

      request.onsuccess = function(e) {
        view_model.datastore = e.target.result;
        callback();
      };
      request.onerror = function() { console.error(this.error); };
    };

    function fetchData(callback) {
      // IndexedDB support:
      if(_checkIndexedDB) {
        _getFromIndexedDB("1970-01-01T00:00:00.413Z", function(IDBRecords) {
            view_model.serviceDB = IDBRecords;
            callback(view_model.serviceDB);
        });
      }
      else {
        // Check for remote records since the epoch:
        _getRemoteRecords("1970-01-01T00:00:00.413Z", function(remoteRecords) {
          view_model.serviceDB = remoteRecords;
          callback(view_model.serviceDB);
        });
      }
    };

    function refreshData(lastTimestamp, callback) {

      console.log("Refresh data was called somewhere");

      // Get new remote records:
      _getRemoteRecords(lastTimestamp, function(returnedRecords) {

        console.log("Remote records worked");

        // If IndexedDB support:
        if(_checkIndexedDB()) {

          console.log("check Indexed db worked");

          console.log("Returned records is: " + JSON.stringify(returnedRecords));

          // Replace affected records in IndexedDB:
          _bulkPutToIndexedDB(returnedRecords, function() {

              console.log("Bulk put worked");

            // Get the whole of IndexedDB:
            _getFromIndexedDB("1970-01-01T00:00:00.413Z", function(currentIndexedDB) {

                console.log("Get from IndexedDB worked");

              view_model.serviceDB = currentIndexedDB;
              callback(view_model.serviceDB);
            });
          });
        }
        else {
          // No IndexedDB support. So perform offline merge here...
        }

      });
    };

    /* --------------- Sync with remote database (Private) --------------- */

    function _getRemoteRecords(lastTimestamp, callback) {
      // Get records updated remotely since the lastCheckedRemote variable.
      $http({method: 'GET', url: '/angularexample/getElements/?after=' + lastTimestamp }).then(
          function successCallback(response) {

            if(response.data.length > 0) {
              view_model.lastCheckedRemote = response.data[0].fields.serverTimestamp;
              //console.log("Last checked is now: " + view_model.lastCheckedRemote);
              callback(response.data);
            }
            else {
              console.log("There were no updated records.");
              callback(response.data);
            }
        }, function errorCallback(response) {
          console.log("An error occurred during retrieval...");
          callback([]);
        });
    };

    /* --------------- Public Functions -------------- */

    // Creates an item object from a basic object. Returns nothing.
    function addItem(basicObject, callback) {

      var newObject = _createObject(basicObject.text, function(returnedObject) {
        _putToIndexedDB(returnedObject.id, returnedObject, function() {
          // Inform the server here and return a useful object.
        });
      } );

    }


    /* --------------- IndexedDB (Private) --------------- */

    function _checkIndexedDB() {
      return !(indexedDB == 'undefined' || indexedDB == null);
    };

    // Return when IndexedDB was last updated. Returns last updated time.
    function _indexedDBLastUpdated(callback) {
      //var lastCheckedReq = _getObjStore('context').get('remoteLastUpdated');
      //lastCheckedReq.onsuccess = function(e) {
        //callback(e.result.time);
      //}
      //lastCheckedReq.onerror = view_model.iDB.onerror;
    };

    // Get from IndexedDB. This function returns appropriate records.
    function _getFromIndexedDB(sinceWhen, callback) {
      var db = view_model.datastore;
      var transaction = db.transaction(["offlineItems"], "readwrite");
      var objStore = transaction.objectStore('offlineItems');
      var keyRange = IDBKeyRange.lowerBound(0);
      var cursorRequest = objStore.openCursor(keyRange);
      var returnableItems = [];
      transaction.oncomplete = function(e) {
        callback(returnableItems);
      };
      cursorRequest.onsuccess = function(e) {
        var result = e.target.result;
        if (!!result == false) { return; }
        console.log(result.value);
        returnableItems.push(result.value);
        result.continue();
      };
      cursorRequest.onerror = function() { console.error("error"); };
    };

    function _bulkPutToIndexedDB(array, callback) {
      var x = 0;
      function loopArray(array) {
        _putToIndexedDB(array[x],function(){
          x++;
          if(x < array.length) {
            loopArray(array);
          }
          else {
            callback();
          }
        });
      };

      loopArray(array);
    };

    // Add/Update to IndexedDB. This function returns nothing.
    function _putToIndexedDB(item, callback) {
      /*
      if(item.id === undefined || item.id === null) {
        _getNextID(function(nextID) {
          item.id = nextID;
          var req = _getObjStore('offlineItems').put(item);
          req.onsuccess = function(e) { callback(); };
          req.onerror = view_model.iDB.onerror;
        });
      }
      else { */
        var req = _getObjStore('offlineItems').put(item);
        req.onsuccess = function(e) { callback(); };
        req.onerror = function() { console.error(this.error); };
      //}
    };

    // Delete from IndexedDB. This function returns nothing.
    function _removeFromIndexedDB(id, callback) {
      var req = _getObjStore('offlineItems').delete(id);
      req.onsucess = function(e) { callback(); }
      req.onerror = function(e) { console.log(e); }
    };

    // Wipe the entire IndexedDB. This function returns nothing.
    function _wipeIndexedDB(callback) {
      var objStore = _getObjStore('offlineItems');
      var req = objStore.clear();
      req.onsuccess = function(e) { callback(objStore.getAll()); }
      req.onerror = function(e) { console.log(e); }
    };


    /* --------------- Utilities --------------- */

    function _createObject(text, callback) {
      _getNextID(function(nextID) {
        callback({ 'id' : nextID, 'text': text, 'timestamp': (new Date().getTime()), 'clicked': false, 'uncheckedID' : true });
      });
    };

    function _getNextID(callback) {
      /* Contact element API call + count somehow */
      $http({method: 'GET', url: '/angularexample/getElements' }).then(
          function successCallback(response) {
            var nextID = response.data.length;    /* this is the 'naiive' nextID way... */
            callback(nextID);
        }, function errorCallback(response) {
            console.log("Could not connect to the DB");   /* In this case, loop through the IndexedDB db and do the same as above... */
        });
    };

    function _getObjStore(name) {
      var db = view_model.datastore;
      var transaction = db.transaction(['offlineItems'], 'readwrite');
      return transaction.objectStore(name);
    };


  });
