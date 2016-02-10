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
      var newObject = {pk: _generateUUID(), fields: localObject };
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


  });
