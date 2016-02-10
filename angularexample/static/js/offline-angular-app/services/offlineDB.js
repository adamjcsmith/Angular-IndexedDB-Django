'use strict';

angular.module('angularTestTwo').service('offlineDB', function($http) {

    // Service Variables
    var view_model = this;
    view_model.idb = null;
    view_model.serviceDB = []; /* Local image of the data */
    view_model.observerCallbacks = [];
    view_model.lastChecked = new Date("1970-01-01T00:00:00.413Z").toISOString(); /* Initially the epoch */
    //view_model.lastChecked = new Date("2016-01-30T10:28:05.413Z").toISOString();

    // Public Functions
    view_model.syncData = syncData;
    view_model.registerController = registerController;
    view_model.addItem = addItem;
    view_model.generateTimestamp = generateTimestamp;

    // Parameters
    view_model.updateAPI = "/angularexample/updateElements";
    view_model.createAPI = "/angularexample/createElements";

    // Determine IndexedDB Support
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

    function addItem(object) {
      alert("pushing " + JSON.stringify(object) + " to serviceDB");
      view_model.serviceDB.push(object);
     };

    function registerController(ctrlCallback) {
       if(view_model.idb == null) {
         establishIndexedDB(function() {
           view_model.observerCallbacks.push(ctrlCallback);
           // Temporary
           /*
           view_model.syncData("1970-01-01T00:00:00.413Z", function(returnedData) {
             view_model.serviceDB = returnedData;
             ctrlCallback();
           }); */
         });
       }
       else {
         view_model.observerCallbacks.push(ctrlCallback);
         // Temporary
         /*
         view_model.syncData("1970-01-01T00:00:00.413Z", function(returnedData) {
           view_model.serviceDB = returnedData;
           ctrlCallback();
         }); */
       }
     };

    function notifyObservers() {
         angular.forEach(view_model.observerCallbacks, function(callback){
           console.log("callback called...");
           callback();
         });
       };


    function establishIndexedDB(callback) {
      if(!_hasIndexedDB) { callback(); /* User's browser has no support for IndexedDB... */ }

      var request = indexedDB.open('localDB', 108);

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


    function newSyncData(callback) {

      _getRemoteRecords(view_model.lastChecked, function(returnedRecords) {

        // Update lastChecked to ensure a consistent refresh cycle:
        var localNewData = _getRecentRecords();
        view_model.lastChecked = generateTimestamp();

        if(returnedRecords.length > 0) {

          if(localNewData.length > 0) {
            // This means that there's new local data and new remote data.
            // We need to patch this data both locally and remotely.
            // Use _compareRecords to determine collisions.

            var result = _compareRecords(localNewData, returnedRecords);
            // We have safe local records, safe remote records here etc.
            // We need to determine patch operations of both.

            _patchServiceDB(result.safeRemote);
            // Now patch remote here!

            // First let's determine the patch operation:
            var patchOperations = _determinePatchOperation(result.safeLocal);
            // Now try patching remote with CREATE operations:
            console.log("Now attempting to post the array, of " + patchOperations.createOperations.length + " size, to remote.");
            _postArrayToRemote(view_model.createAPI, patchOperations.createOperations, function() {
              alert("Posted the array");
            });

          }
          else {
            // This means that there's no new local data, but there's new remote data.
            // Means that we should patch this data to serviceDB.
            // Use _determinePatchOperation to sort creates from updates
            // Cover the case where serviceDB is empty - eg this is the first loop through.

            _patchServiceDB(returnedRecords);
            callback();
          }

          // Do remote patching here.
          // Update IndexedDB here with a bulk put ()
          // Then copy to serviceDB.
        }
        else {
          // This means there were no new remote records.
          // All local patches to remote will be safe.


        }

      });

    };


    function _patchServiceDB(remoteRecords) {
      var operations = _determinePatchOperation(remoteRecords);
      //alert("The operations to create were: " + JSON.stringify(operations.createOperations) + ", and the operations to update were: " + JSON.stringify(operations.updateOperations));

      console.log("... and there were: " + operations.updateOperations.length + " update ops, and " + operations.createOperations.length + " create ops");

      _updatesToServiceDB(operations.updateOperations);
      _pushToServiceDB(operations.createOperations);
    };

    function _pushToServiceDB(array) {
      for(var i=0; i<array.length; i++) {
        view_model.serviceDB.push(array[i]);
      }
    };

    function _updatesToServiceDB(array) {
      for(var i=0; i<array.length; i++) {
        var matchID = _.findIndex(view_model.serviceDB, {"pk" : array[i].pk });
        if(matchID > -1) {
          view_model.serviceDB[matchID] = array[i]; // Replace whole record.
        }
      }
    };


    function _getRecentRecords() {
      // Loop through the serviceDB (possibly using lodash _.filter) to derive records newer than last_checked.
      var localNew = _.filter(view_model.serviceDB, function(o) { var theDate = new Date(o.fields.timestamp); return theDate > view_model.lastChecked; });
      //alert("recent records were: " + localNew);
      return localNew;
    };


    /* Compare local updates with server updates */
    function _compareRecords(localNew, remoteNew) {
      var conflictingRecords = [];
      var safeRemote = remoteNew;
      var safeLocal = [];
      for(var i=0; i<localNew.length; i++) {
        var matchID = -1;
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
      for(var i=0; i<safeLocal.length; i++) {
        var query = _.findIndex(view_model.serviceDB, {'pk' : safeLocal[i].pk });
        console.log("_determinePatchOperation query was: " + query);
        console.log("serviceDB length is: " + view_model.serviceDB.length);
        if(query > -1 ) updateOps.push(safeLocal[i]);
        else createOps.push(safeLocal[i]);
      }
      return { updateOperations: updateOps, createOperations: createOps };
    };


    /* To be deprecated in a future edit */
    function syncData(lastTimestamp, callback) {

      console.log("Refresh data was called somewhere");

      // Get new remote records:
      _getRemoteRecords(lastTimestamp, function(returnedRecords) {

        console.log("Remote records worked");

        // If IndexedDB support:
        if(_hasIndexedDB()) {

          console.log("check Indexed db worked");

          console.log("Returned records is: " + JSON.stringify(returnedRecords));

          // Replace affected records in IndexedDB:
          _putArrayToIndexedDB(returnedRecords, function() {

              console.log("Bulk put worked");

            // Get the whole of IndexedDB:
            _getRangeFromIndexedDB("1970-01-01T00:00:00.413Z", function(currentIndexedDB) {

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

    /* --------------- Remote (Private) --------------- */

    function _getRemoteRecords(lastTimestamp, callback) {
      $http({
          method: 'GET',
          url: '/angularexample/getElements/?after=' + lastTimestamp
        })
        .then(
          function successCallback(response) {
            if(response.data.length > 0) { callback(response.data); }
            else { callback(response.data); }
        }, function errorCallback(response) {
          callback([]); /* If the remote lookup was unsuccessful, return blank array */
        });
    };

    // Attempts to post data to a URL.
    function _postArrayToRemote(url, array, callback) {
      var transformedArray = angular.toJSON(array);
      $http({
          url: '/angularexample/createElements',
          method: "POST",
          data: transformedArray,
          headers: {'Content-Type': 'application/x-www-form-urlencoded' }
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
    function _getRangeFromIndexedDB(sinceWhen, callback) {
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

    /* --------------- Check Loop --------------- */


    function generateTimestamp() {
      var d = new Date();
      return d.toISOString();
    };


    (function syncLoop() {
      setTimeout(function() {
        newSyncData(function() {
          notifyObservers();
        });
        /*
        view_model.syncData("1970-01-01T00:00:00.413Z", function(returnedData) {
          view_model.serviceDB = returnedData;
          notifyObservers();
          _getRecentRecords();
        });
        */
        syncLoop();
      }, 4000);
      })();



  /* --------------- Recycling -------------- */

  /*
      function getInitialData(callback) {
        // If IndexedDB is supported:
        if(_hasIndexedDB) {
          // If IDB storage is not yet been instantiated:
          if(view_model.idb == null) {
            establishIndexedDB(function() {
              _getRangeFromIndexedDB("1970-01-01T00:00:00.413Z", function(IDBRecords) {
                  view_model.serviceDB = IDBRecords;
                  callback(view_model.serviceDB);
              });
            })
          } else {
            _getRangeFromIndexedDB("1970-01-01T00:00:00.413Z", function(IDBRecords) {
                view_model.serviceDB = IDBRecords;
                callback(view_model.serviceDB);
            });
          }

        }
        else {
          // Check for remote records since the epoch:
          _getRemoteRecords("1970-01-01T00:00:00.413Z", function(remoteRecords) {
            view_model.serviceDB = remoteRecords;
            callback(view_model.serviceDB);
          });
        }
      };
    */




  });
