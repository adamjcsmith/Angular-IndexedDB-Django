'use strict';

angular.module('angularTestTwo')
  .service('offlineDB', function($rootScope, $http) {

    var view_model = this;

    view_model.tDB = {};
    view_model.datastore = null;
    view_model.openDB = openDB;
    view_model.fetchData = fetchData;
    view_model.createItem = createItem;
    view_model.updateItem = updateItem;
    view_model.deleteItem = deleteItem;
    view_model.clearDB = clearDB;

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
        var contextReq = _getObjStore().put( {id: 'remoteLastUpdated', 'time' : new Date().getTime() } );
        contextReq.onsuccess = function(e) { /* do nothing for now */ };
        contextReq.onerror = view_model.tDB.onerror;

        /* --------------- DEPRECATED --------------- */
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

    function fetchData(callback) {
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
      cursorRequest.onerror = view_model.tDB.onerror;
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


    // Ask the database whether it has been updated since our last check.
    function checkRemote(callback) {
      var db = view_model.datastore;
      var transaction = db.transaction(['testItems'], 'readwrite');
      var contextStore = transaction.objectStore('context');
      var lastCheckedReq = contextStore.get('remoteLastUpdated');
      lastCheckedReq.onsuccess = function(e) {
        /* Here, we now have the last time we checked. Connect to SQLite here to discover its last updated time and compare... */
        /* For now, always return true for diagnostics! */
        callback(true);
      }
      lastCheckedReq.onerror = view_model.tDB.onerror;
    }


    /* --------------- IndexedDB (Private) --------------- */

    // Add/Update to IndexedDB. This function returns nothing.
    function _putToIndexedDB(id, item, callback) {
      if(id === undefined || id === null) {
        _getNextID(function(nextID) {
          item.id = nextID;
          var req = _getObjStore().put(item);
          req.onsuccess = function(e) { callback(); };
          req.onerror = view_model.tDB.onerror;
        });
      }
      else {
        var req = _getObjStore().put(item);
        req.onsuccess = function(e) { callback(); };
        req.onerror = view_model.tDB.onerror;
      }
    };

    // Delete from IndexedDB. This function returns nothing.
    function _removeFromIndexedDB(id, callback) {
      var req = _getObjStore().delete(id);
      req.onsucess = function(e) { callback(); }
      req.onerror = function(e) { console.log(e); }
    };

    // Wipe the entire IndexedDB. This function returns nothing.
    function _wipeIndexedDB(callback) {
      var objStore = _getObjStore();
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

    function _getObjStore() {
      var db = view_model.datastore;
      var transaction = db.transaction(['testItems'], 'readwrite');
      return transaction.objectStore('testItems');
    };


    /* --------------- Old --------------- */

        /*
        function createItem(item, id, callback) {
          var testItem = _createObject(id, item.name, function(returnedObject) {
            var request = _getObjStore().put(returnedObject);
            request.onsuccess = function(e) { callback(returnedObject); };
            request.onerror = view_model.tDB.onerror;
          });
        };

        function updateItem(item, callback) {
          item.clicked = !item.clicked;
          var request = _getObjStore().put(item);
          request.onsuccess = function(e) { callback(item); }
          request.onerror = function(e) { console.log(e); }
        };

        function deleteItem(item, callback) {
          var request = _getObjStore().delete(item.timestamp);
          request.onsuccess = function(e) { callback(); }
          request.onerror = function(e) { console.log(e); }
        };

        function clearDB(callback) {
          var objStore = _getObjStore();
          var request = objStore.clear();
          request.onsuccess = function(e) { callback(objStore.getAll()); }
          request.onerror = function(e) { console.log(e); }
        };
        */


  });
