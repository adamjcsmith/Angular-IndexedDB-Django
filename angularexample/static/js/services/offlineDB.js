'use strict';

angular.module('angularTestTwo')
  .service('offlineDB', function($http) {

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
      var version = 6;
      var request = indexedDB.open('testItems', version);

      // Handle Upgrades:
      request.onupgradeneeded = function(e) {
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
      };

      // Handle successful datastore access:
      request.onsuccess = function(e) {
        view_model.datastore = e.target.result;
        callback();
      };

      request.onerror = view_model.tDB.onerror;
    };

    function fetchData(callback) {
      var db = view_model.datastore;
      var transaction = db.transaction(['testItems'], 'readwrite');
      var objStore = transaction.objectStore('testItems');
      var keyRange = IDBKeyRange.lowerBound(0);
      var cursorRequest = objStore.openCursor(keyRange);
      var testItems = [];

      // Execute callback on complete:
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
      var db = view_model.datastore;
      var transaction = db.transaction(['testItems'], 'readwrite');
      var objStore = transaction.objectStore('testItems');
      var timestamp = new Date().getTime();

      var testItem = {
        'text': item.text,
        'timestamp': timestamp,
        'clicked': false
      };

      var request = objStore.put(testItem);
      request.onsuccess = function(e) {
        callback(testItem);
      };

      request.onerror = view_model.tDB.onerror;
    };

    function updateItem(item, callback) {
      var db = view_model.datastore;
      var transaction = db.transaction(['testItems'], 'readwrite');
      var objStore = transaction.objectStore('testItems');

      item.clicked = !item.clicked;
      var request = objStore.put(item);
      request.onsuccess = function(e) {
        callback(item);
      }
      request.onerror = function(e) {
        console.log(e);
      }
    };

    function deleteItem(item, callback) {
      var db = view_model.datastore;
      var t = db.transaction(['testItems'], 'readwrite');
      var objStore = t.objectStore('testItems');

      var request = objStore.delete(item.timestamp);

      request.onsuccess = function(e) {
        callback();
      }

      request.onerror = function(e) {
        console.log(e);
      }
    };

    function clearDB(callback) {
      var db = view_model.datastore;
      var transaction = db.transaction(['testItems'], 'readwrite');
      var objStore = transaction.objectStore('testItems');
      var request = objStore.clear();

      request.onsuccess = function(e) {
        callback(objStore.getAll());
      }

      request.onerror = function(e) {
        console.log(e);
      }
    }


  });
