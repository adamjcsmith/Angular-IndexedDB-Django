'use strict';

angular.module('angularTestTwo')
  .controller('mainCtrl', function($scope, offlineDB) {

    $scope.testTitle = "Testing AngularJS + IndexedDB...";
    $scope.updateThis = updateThis;
    $scope.deleteThis = deleteThis;
    $scope.newItem = newItem;
    $scope.clearDB = clearDB;
    $scope.dataModel = [];

    offlineDB.establishIndexedDB(function() {
      offlineDB.getInitialData(function(dataModel) {
          $scope.dataModel = dataModel;
          _updateToUI("Fetched Items from Service");
      });
    });

    function createObject() {
      // return { 'id' : nextID, 'text': text, 'timestamp': (new Date().getTime()), 'clicked': false, 'uncheckedID' : true }
    };

    function clearDB() {
      offlineDB.clearDB(function(returnedArray) {
        if(Object.keys(returnedArray).length == 0) {
            $scope.dataModel = [];
            _updateToUI("Cleared");
        }
        else { console.log("Error: Returned array was not empty."); }
      });
    };

    function newItem(item) {
      alert("New item called");
      offlineDB.createItem({name: item}, null, function(returnedObject) {
        $scope.dataModel.push(returnedObject);
        _updateToUI("Added.");
      });
    };

    function updateThis(item) {
      var sanitisedItem = item;
      delete sanitisedItem.$$hashKey;
      offlineDB.updateItem(sanitisedItem, function(returnedItem) {
        $scope.dataModel[$scope.dataModel.indexOf(item)] = returnedItem;
        _updateToUI("Updated.");
      });
    };

    function deleteThis(item) {
      offlineDB.deleteItem(item, function() {
        $scope.dataModel.splice($scope.dataModel.indexOf(item), 1);
        _updateToUI("Deleted.");
      })
    };

    /* ---------- Private functions ---------- */
    function _updateToUI(text) {
      $scope.$applyAsync();
      _sendNotification(text);
    }

    function _sendNotification(text) {
      $.notify(text, {position: "bottom right", showDuration: 100, className: "success"});
    };

    (function timeout() {
      setTimeout(function() {
        offlineDB.syncData("1970-01-01T00:00:00.413Z", function(returnedData) {
          // POTENTIAL OPTIMISATION
          //if(returnedData != $scope.dataModel) $scope.dataModel = returnedData;
          $scope.dataModel = returnedData;
          _updateToUI("Synced with Server");
        });
        timeout();
      }, 4000);

      })();


    /* Synchronise every four seconds. */
    /*
    $scope.cacheddataModel = $scope.dataModel;
    (function timeout() {
      setTimeout(function () {
          console.log("Calling timeout.");
            $scope.$apply();
          timeout();
      }, 1000);
    })();
    */


  });
