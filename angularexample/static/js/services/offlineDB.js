'use strict';

angular.module('angularTestTwo')
  .service('offlineDB', function($http) {

    var view_model = this;
    view_model.datastore = null;
    view_model.openDB = openDB;
    view_model.fetchData = fetchData;
    view_model.refreshData = refreshData;
    view_model.clearDB = clearDB;
    view_model.lastCheckedRemote = "1970-01-01T00:00:00.413Z";
    view_model.serviceDB = []; /* Local image of the data */

    function clearDB(callback) { callback({}); }

    function openDB(callback) {
      var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
      if(!_checkIndexedDB) { callback(); /* User's browser has no support for IndexedDB... */ }

      var request = indexedDB.open('localDB', 106);
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

      // Get records updated remotely since the lastCheckedRemote variable.
    function _getRemoteRecords(lastTimestamp, callback) {
      $http({method: 'GET', url: '/angularexample/getElements/?after=' + lastTimestamp }).then(
          function successCallback(response) {
            if(response.data.length > 0) {
              view_model.lastCheckedRemote = response.data[0].fields.serverTimestamp;
              callback(response.data);
            }
            else {
              callback(response.data); /* Return blank array */
            }
        }, function errorCallback(response) {
          callback([]); /* If the remote lookup was unsuccessful, return blank array */
        });
    };

    /* --------------- CRUD Functions -------------- */



    /* --------------- IndexedDB (Private) --------------- */

    function _checkIndexedDB() {
      return !(indexedDB == 'undefined' || indexedDB == null);
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

    // Apply array of edited objects to IndexedDB.
    function _bulkPutToIndexedDB(array, callback) {
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

    // Wipe the entire IndexedDB. This function returns nothing.
    function _wipeIndexedDB(callback) {
      var objStore = _getObjStore('offlineItems');
      var req = objStore.clear();
      req.onsuccess = function(e) { callback(objStore.getAll()); }
      req.onerror = function() { console.error(this.error); };
    };


    /* --------------- Utilities --------------- */

    function _createObject(text, callback) {
        //callback({ 'id' : nextID, 'text': text, 'timestamp': (new Date().getTime()), 'clicked': false, 'uncheckedID' : true });
    };

    /* -------------- TO BE DEPRECATED -------------- */
    function _getNextID(callback) {
      /* Replace with UUID method */
    };

    function _getObjStore(name) {
      var db = view_model.datastore;
      var transaction = db.transaction(['offlineItems'], 'readwrite');
      return transaction.objectStore(name);
    };


  });
