'use strict';

angular.module('angularTestTwo')
  .service('offlineDB', function($rootScope, $http) {

    var view_model = this;
    view_model.datastore = null;
    view_model.openDB = openDB;
    view_model.fetchData = fetchData;
    view_model.clearDB = clearDB;
    view_model.lastCheckedRemote = " ";

    function clearDB(callback) { callback({}); }

    function openDB(callback) {

      // 1. Instantiate IndexedDB
      var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
      if(!_checkIndexedDB) {
        alert("IndexedDB is not supported on your system. If you go offline, changes you make won't be saved.");
        callback();
      }

      /* --------------- Put this in fetchData! --------------- */
      /* ------------------------------------------------------ */

      // 2. Setup IndexedDB with static version number
      var request = indexedDB.open('offlineDB', 100);
      var upgradeRequired = false;

      // 3. Handle (unlikely event) upgrades
      request.onupgradeneeded = function(e) {
        var upgradeRequired = true;
        var db = e.target.result;
        e.target.transaction.onerror = function() { console.error(this.error); };

        if(db.objectStoreNames.contains('offlineItems')) {
          db.deleteObjectStore('offlineItems');
          db.deleteObjectStore('offlineContext');
        }
        db.createObjectStore('offlineItems', { keyPath: 'timestamp', autoIncrement: false } );
        db.createObjectStore('offlineContext', { keyPath: 'id' } );

        callback();
      };

      if(!upgradeRequired) {
        request.onsuccess = function(e) {
          view_model.datastore = e.target.result;
          callback();
        };
        request.onerror = function() { console.error(this.error); };
      }
    };





    function fetchData(callback) {
      var testItems = [];

      // 1.5. Ask the database for last updated:
      //if(view_model.datastore.objectStoreNames.contains('offlineContext')) {
        // Get the variable here and compare to the remote DB. Call getRemote() if appropriate.
      //}

      callback(testItems);
      /*
      var db = view_model.datastore;
      var transaction = db.transaction(['testItems'], 'readwrite');
      var objStore = transaction.objectStore('testItems');
      var keyRange = IDBKeyRange.lowerBound(0);
      var cursorRequest = objStore.openCursor(keyRange);
      var testItems = [];
      transaction.oncomplete = function(e) {
        callback(testItems);
      };
      cursorRequest.onsuccess = function(e) {
        var result = e.target.result;
        if (!!result == false) { return; }
        testItems.push(result.value);
        result.continue();
      };
      cursorRequest.onerror = view_model.iDB.onerror;
      */
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


    /* --------------- Sync with remote database (Private) --------------- */

    function sync(method, id, callback) {
      // Do something here.

      switch (method) {

        case 'add':
          // Contact DB here:
          console.log("Contact DB here");
          console.log("Make sure to change the uncheckedID flag to false if successful connection.");
        case 'update':
          console.log("Contact DB here");
        case 'remove':
          console.log("Contact DB here");

      };

    };

    // Check whether newer data is available remotely.
    function _checkForRemoteUpdate(callback) {
      // _remoteLastUpdated();
      _indexedDBLastUpdated(function(lastTime) {
        // Here we now have the last time the local storage was updated. Check that the DB time does not exceed this.
        callback(true);   /* For now, always return true for diagnostics! */
      });
    };



    // Get all the server data or just some of it? Dynamic?
    function _getServerData() {

    };


    /*

    // Ask the database whether it has been updated since our last check.
    function _remoteLastUpdated(callback) {
      // Here, we now have the last time we checked. Connect to SQLite here to discover its last updated time and compare...

      $http({method: 'GET', url: '/angularexample/getElements/?after=' + view_model.lastCheckedRemote }).then(
          function successCallback(response) {
            // Pull out the value here:
            alert("Response length was: " + response.length);
            callback();
        }, function errorCallback(response) {
          alert("An error occurred during retrieval...");
        });
    };

    */

    /* --------------- IndexedDB (Private) --------------- */

    function _checkIndexedDB() {
      return !(indexedDB == 'undefined' || indexedDB == null);
    };

    // Return when IndexedDB was last updated. Returns last updated time.
    function _indexedDBLastUpdated(callback) {
      var lastCheckedReq = _getObjStore('context').get('remoteLastUpdated');
      lastCheckedReq.onsuccess = function(e) {
        callback(e.result.time);
      }
      lastCheckedReq.onerror = view_model.iDB.onerror;
    };

    // Add/Update to IndexedDB. This function returns nothing.
    function _putToIndexedDB(id, item, callback) {
      if(id === undefined || id === null) {
        _getNextID(function(nextID) {
          item.id = nextID;
          var req = _getObjStore('testItems').put(item);
          req.onsuccess = function(e) { callback(); };
          req.onerror = view_model.iDB.onerror;
        });
      }
      else {
        var req = _getObjStore('testItems').put(item);
        req.onsuccess = function(e) { callback(); };
        req.onerror = view_model.tDB.onerror;
      }
    };

    // Delete from IndexedDB. This function returns nothing.
    function _removeFromIndexedDB(id, callback) {
      var req = _getObjStore('testItems').delete(id);
      req.onsucess = function(e) { callback(); }
      req.onerror = function(e) { console.log(e); }
    };

    // Wipe the entire IndexedDB. This function returns nothing.
    function _wipeIndexedDB(callback) {
      var objStore = _getObjStore('testItems');
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
            alert("Could not connect to the DB");   /* In this case, loop through the IndexedDB db and do the same as above... */
        });
    };

    function _getObjStore(name) {
      var db = view_model.datastore;
      var transaction = db.transaction(['offlineItems'], 'readwrite');
      return transaction.objectStore(name);
    };


    /* --------------- Recycle Bin --------------- */

    /*
    view_model.createItem = createItem;
    view_model.updateItem = updateItem;
    view_model.deleteItem = deleteItem; */

    /*
        function openDB(callback) {
          var version = 51;
          var request = indexedDB.open('testItems', version);
          var upgradeNeeded = false;

          request.onupgradeneeded = function(e) {
            upgradeNeeded = true;
            var db = e.target.result;
            e.target.transaction.onerror = view_model.tDB.onerror;

            // Delete old data store and create a new one:
            if(db.objectStoreNames.contains('testItems')) {
              db.deleteObjectStore('testItems');
              db.deleteObjectStore('context');
            }
            var store = db.createObjectStore('testItems',
              { keyPath: 'timestamp', autoIncrement: false }
            );
            var context = db.createObjectStore('context',
              { keyPath: 'id' }
            );

            // Add context values if no previous DB exists:
            var contextReq = _getObjStore('testItems').put( {id: 'remoteLastUpdated', 'time' : new Date().getTime() } );
            contextReq.onsuccess = function(e) { };
            contextReq.onerror = view_model.tDB.onerror;

            $http({method: 'GET', url: '/angularexample/getElements' }).then(
                function successCallback(response) {
                    createItem(response.data[0].fields, response.data[0].pk, function() {
                        console.log("New item created");
                        view_model.datastore = e.target.result;
                        callback();
                    });
              }, function errorCallback(response) {
                alert("An error occurred during retrieval...");
              });
          };

          // If an upgrade was not needed then fire the callback:
          if(!upgradeNeeded) {
            request.onsuccess = function(e) {
              view_model.datastore = e.target.result;
              callback();
            };
            request.onerror = view_model.tDB.onerror;
          }
        };

    */


  });
