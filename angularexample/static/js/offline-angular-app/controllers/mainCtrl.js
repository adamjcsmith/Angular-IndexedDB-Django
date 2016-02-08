'use strict';

angular.module('angularTestTwo')
  .controller('mainCtrl', function($scope, offlineDB) {

    /* $scope.updateThis = updateThis;
    $scope.deleteThis = deleteThis;
    $scope.newItem = newItem;
    $scope.clearDB = clearDB; */

    $scope.createObject = createObject;

    $scope.dataModel = [];

    offlineDB.establishIndexedDB(function() {
      offlineDB.getInitialData(function(dataModel) {
          $scope.dataModel = dataModel;
          _updateToUI("Fetched Items from Service");
      });
    });

    function transformObject() {
      // return { 'id' : nextID, 'text': text, 'timestamp': (new Date().getTime()), 'clicked': false, 'uncheckedID' : true }
      return "";
    };

    function createObject(localObject) {
      localObject.id = _generateUUID();
      localObject.timestamp = _generateTimestamp();

      // Add to serviceDB (?);

/*
      offlineDB.addItem(localObject, function(returnedObject) {
        $scope.dataModel.push(returnedObject);
        _updateToUI("Added.");
      });
*/

    };


/*
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

*/


    /* ---------- Private functions ---------- */
    function _updateToUI(text) {
      $scope.$applyAsync();
      _sendNotification(text);
    }

    function _sendNotification(text) {
      $.notify(text, {position: "bottom right", showDuration: 100, className: "success"});
    };

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

    function _generateTimestamp() {
      var d = new Date();
      return d.toISOString();
    };

/*
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
    */

  });
