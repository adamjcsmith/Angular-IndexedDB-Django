'use strict';

angular.module('angularTestTwo')
  .controller('mainCtrl', function($scope, offlineDB) {

    $scope.dataModel = [];

    $scope.createObject = createObject;


    /* Controller observer-pattern function */
    var updateCtrl = function(){
      $scope.dataModel = offlineDB.serviceDB;
      _updateToUI("Data Model Updated");
    };

    offlineDB.registerController(updateCtrl);


    // Package an object and send to Service
    function createObject(localObject) {
      localObject.timestamp = offlineDB.generateTimestamp();
      var newObject = { fields: localObject };
      offlineDB.addItem(newObject);
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