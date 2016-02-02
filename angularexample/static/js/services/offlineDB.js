'use strict';

angular.module('angularTestTwo').service('offlineDB', function($http) {

    var view_model = this;
    view_model.datastore = null;
    view_model.serviceDB = []; /* Local image of the data */

    view_model.openDB = openDB;
    view_model.fetchData = fetchData;
    view_model.refreshData = refreshData;

    function openDB(callback) {
      var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
      if(!_checkIndexedDB) { callback(); /* User's browser has no support for IndexedDB... */ }

      var request = indexedDB.open('localDB', 106);

      request.onupgradeneeded = function(e) {
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

    /* --------------- CRUD Functions -------------- */

    /* --------------- Remote (Private) --------------- */

    function _getRemoteRecords(lastTimestamp, callback) {
      $http({method: 'GET', url: '/angularexample/getElements/?after=' + lastTimestamp }).then(
          function successCallback(response) {
            if(response.data.length > 0) { callback(response.data); }
            else { callback(response.data); }
        }, function errorCallback(response) {
          callback([]); /* If the remote lookup was unsuccessful, return blank array */
        });
    };

    /* --------------- IndexedDB (Private) --------------- */

    function _checkIndexedDB() {
      return !(indexedDB == 'undefined' || indexedDB == null);
    };

    // Get from IndexedDB. This function returns appropriate records.
    function _getFromIndexedDB(sinceWhen, callback) {
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

    function _newIDBTransaction() {
      return view_model.datastore.transaction(['offlineItems'], 'readwrite');
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
      var uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = (d + Math.random()*16)%16 | 0;
          d = Math.floor(d/16);
          return (c=='x' ? r : (r&0x3|0x8)).toString(16);
      });
      return uuid;
    };

  });
