'use strict';

angular.module('angularTestTwo')
  .controller('mainCtrl', function($scope, offlineDB) {

    /* Controller Model */
    $scope.dataModel = [];

    $scope.createObject = createObject;
    $scope.forceRefresh = forceRefresh;
    $scope.updateObject = updateObject;
    $scope.deleteObject = deleteObject;

    /* Controller observer-pattern function */
    var updateCtrl = function(response) {
      $scope.dataModel = offlineDB.serviceDB;
      _updateToUI("Update: " + response);
    };

    offlineDB.registerController(updateCtrl);

    // Package an object and send to Service
    function createObject(localObject) {
      localObject.timestamp = offlineDB.generateTimestamp();
      localObject.deleted = false;
      var newObject = { fields: localObject };
      offlineDB.objectUpdate(newObject);
    };

    function updateObject(localObject) {
      localObject.fields.timestamp = offlineDB.generateTimestamp();
      offlineDB.objectUpdate(localObject);
    }

    function deleteObject(localObject) {
      localObject.fields.deleted = true;
      updateObject(localObject);
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
