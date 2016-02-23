'use strict';

angular.module('angularTestTwo')
  .controller('mainCtrl', function($scope, offlineDB) {

    $scope.dataModel = [];

    $scope.createObject = createObject;
    $scope.forceRefresh = forceRefresh;
    $scope.updateObject = updateObject;
    $scope.deleteObject = deleteObject;
    $scope.tellMe = tellMe;

    /* Controller observer-pattern function */
    var updateCtrl = function(response){
      $scope.dataModel = offlineDB.serviceDB;
      _updateToUI("Update: " + response);
    };

    offlineDB.registerController(updateCtrl);

    function tellMe(object) {
      alert(JSON.stringify(object));
    };

    // Package an object and send to Service
    function createObject(localObject) {
      localObject.timestamp = offlineDB.generateTimestamp();
      localObject.deleted = false;
      var newObject = { fields: localObject };
      console.log("Creating a new object, with attributes: " + JSON.stringify(newObject));
      offlineDB.addItem(newObject);

    };

    function updateObject(localObject) {
      console.log("Update object called, object was: " + JSON.stringify(localObject));
      localObject.fields.timestamp = offlineDB.generateTimestamp();
      offlineDB.updateItem(localObject);
    }

    function deleteObject(localObject) {
      console.log("Delete object called, object was: " + JSON.stringify(localObject));
      localObject.fields.deleted = true;
      localObject.fields.timestamp = offlineDB.generateTimestamp();
      offlineDB.updateItem(localObject);
    }

    function forceRefresh() {
      offlineDB.newSyncThree(function(response) {
        updateCtrl(response);
      });
    };



    /* ---------- Private functions ---------- */
    function _updateToUI(text) {
      $scope.$applyAsync();
      _sendNotification(text);
    }

    function _sendNotification(text) {
      $.notify(text, {position: "bottom right", showDuration: 100, className: "success"});
    };



  });
