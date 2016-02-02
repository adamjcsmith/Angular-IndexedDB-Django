'use strict';

angular.module('angularTestTwo')
  .controller('mainCtrl', function($scope, offlineDB) {

    $scope.testTitle = "Testing AngularJS + IndexedDB...";
    $scope.updateThis = updateThis;
    $scope.deleteThis = deleteThis;
    $scope.newItem = newItem;
    $scope.clearDB = clearDB;
    $scope.testItems = [];

    offlineDB.openDB(function() {
      offlineDB.fetchData(function(testItems) {
          $scope.testItems = testItems;
          _updateToUI("Fetched Items from Service");
      });
    });

    function clearDB() {
      offlineDB.clearDB(function(returnedArray) {
        if(Object.keys(returnedArray).length == 0) {
            $scope.testItems = [];
            _updateToUI("Cleared");
        }
        else { console.log("Error: Returned array was not empty."); }
      });
    };

    function newItem(item) {
      offlineDB.createItem({name: item}, null, function(returnedObject) {
        $scope.testItems.push(returnedObject);
        _updateToUI("Added.");
      });
    };

    function updateThis(item) {
      var sanitisedItem = item;
      delete sanitisedItem.$$hashKey;
      offlineDB.updateItem(sanitisedItem, function(returnedItem) {
        $scope.testItems[$scope.testItems.indexOf(item)] = returnedItem;
        _updateToUI("Updated.");
      });
    };

    function deleteThis(item) {
      offlineDB.deleteItem(item, function() {
        $scope.testItems.splice($scope.testItems.indexOf(item), 1);
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
        offlineDB.refreshData("1970-01-01T00:00:00.413Z", function(returnedData) {
          // POTENTIAL OPTIMISATION
          //if(returnedData != $scope.testItems) $scope.testItems = returnedData;
          $scope.testItems = returnedData;
          _updateToUI("Synced with Server");
        });
        timeout();
      }, 4000);

      })();


    /* Synchronise every four seconds. */
    /*
    $scope.cachedTestItems = $scope.testItems;
    (function timeout() {
      setTimeout(function () {
          console.log("Calling timeout.");
            $scope.$apply();
          timeout();
      }, 1000);
    })();
    */


  });
