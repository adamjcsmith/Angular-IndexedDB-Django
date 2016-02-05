'use strict';

angular.module('angularTestTwo')
  .service('fakeAPI', function($http) {

    var view_model = this;

    view_model.getPeople = getPeople;


    function getPeople(callback) {
        //$http.jsonp('http://jsonplaceholder.typicode.com/users/?callback=JSON_CALLBACK').then(angular.bind(context, callback));
        $http.jsonp('http://jsonplaceholder.typicode.com/users/?callback=JSON_CALLBACK').then(callback);
      };

  });
