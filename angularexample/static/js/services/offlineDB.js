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
      var version = 41;
      var request = indexedDB.open('testItems', version);
      var upgradeNeeded = false;

      // If a database upgrade is needed:
      request.onupgradeneeded = function(e) {
        upgradeNeeded = true;
        var db = e.target.result;
        e.target.transaction.onerror = view_model.tDB.onerror;

        // Delete old data store:
        if(db.objectStoreNames.contains('testItems')) {
          db.deleteObjectStore('testItems');
        }

        // Create new data store:
        var store = db.createObjectStore('testItems', {
          keyPath: 'timestamp', autoIncrement: false
        });

        // This is possibly inefficient...
        $http({method: 'GET', url: '/angularexample/getElements' }).then(
            function successCallback(response) {
                createItem(response.data[0].fields, function() {
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

    function createItem(item, callback) {
      var timestamp = new Date().getTime();
      var testItem = {
        'text': item.name,
        'timestamp': timestamp,
        'clicked': false
      };
      var request = _getObjStore().put(testItem);
      request.onsuccess = function(e) { callback(testItem); };
      request.onerror = view_model.tDB.onerror;
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
      var request = _getObjStore().clear();
      request.onsuccess = function(e) { callback(objStore.getAll()); }
      request.onerror = function(e) { console.log(e); }
    }

    function _getObjStore() {
      var db = view_model.datastore;
      var transaction = db.transaction(['testItems'], 'readwrite');
      return transaction.objectStore('testItems');
    }

  });
