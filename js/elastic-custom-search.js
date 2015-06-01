/**
 * Description
 *
 * Version 1.1
 *
 * Script to implement angular app to fetch and process qbox data 
 * and put the location name from drupal to searched data.
 *
 * @package   octopus
 * @author    octopus
 * @copyright 2015-2016 octopus
 */

/**
 * Declaring the angular module
 */
var app = angular
    .module('octopus', ['ui.bootstrap', 'ngRoute', 'elasticjs.service', 'ngSanitize']);

/**
 * Creating the routing controller and enabling clean urls with html5 mode
 */
app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    'use strict';    
    
    //  Adding routing options  
    $routeProvider        
        .when('/', {templateUrl: 'result.html', controller: 'SearchResultCtrl'})
        .when('/index.html', {templateUrl: 'result.html', controller: 'SearchResultCtrl'})
        .when('/:type/:id', {templateUrl: 'result.html', controller: 'SearchResultCtrl'})
        .when('/:type/:id/:start', {templateUrl: 'result.html', controller: 'SearchResultCtrl'});            
    
    //  Enabling HTML5 mode 
    $locationProvider
        .html5Mode(true);
}]);

/**
 * Creating a controller to fetch data from drupal views JSON and populate the
 * dropdown.
 */
app.controller('DropdownCtrl', function ($scope, $http) {
    'use strict';
    $scope.status = 'loading...';
    $scope.country = "Select Country";
    
    $scope.data = {
        "locations": {}
    };    
    
    /**
     * Implementing the angularjs JSONP function to fetch data from drupal's
     * view json.
     */
    $http.jsonp("http://www.ssdkolkata.net/octopus/drupal/?q=location-json&callback=JSON_CALLBACK")
        .success(function(data){            
            $scope.data.locations.term = data.nodes;
            $scope.status = "loaded "
                    + $scope.data.locations.term.length
                    + " term.";
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }).error(function (data, status, headers, config) {
            /**
             * Displaying message in console if there is any error during data 
             * fetching using JSONP
             */  
            console.log("Unable to complete JSONP call for status = "+status);
        });
});

/**
 * Creating a controller for the result section.
 * Fetching data results from elastic search (qbox)
 */
app.controller('SearchResultCtrl', function ($scope, $routeParams, $http, ejsResource) {
    'use strict';
    var locationJson = '';
    $scope.type = $routeParams.type;
    $scope.id = $routeParams.id;
    
    /**
     * Detecting the current starting position of the resultset, from 
     * url parameter
     */
    var currentStartPos = parseInt($routeParams.start);
    var startFrom = 1;
    if (currentStartPos > 0) {
        startFrom = currentStartPos;
    }

    /**
     * Calculating the new start position for nextpage and previous 
     * page's start position
     */
    var newStartPos = parseInt(startFrom) + 10;
    var prevStartPos = parseInt(startFrom) - 10;    
    if (prevStartPos <= 0) {
        prevStartPos = 1;
    }
    
    /**
     * Defining the redirecting url for previous page and next page links
     */
    $scope.dataurl = "";
    $scope.dataurl = {
        "nextUrl": {}
    };
    $scope.dataurl = {
        "prevUrl": {}
    };
    
    /**
     * Checking the current location id and creating the redirecting url 
     * for previous page and next page links
     */
    if (typeof $scope.id === 'undefined' || $scope.id === 'all') {
        $scope.dataurl.nextUrl = 'location/all/' + newStartPos;
        $scope.dataurl.prevUrl = 'location/all/' + prevStartPos;        
    } else {
        $scope.dataurl.nextUrl = 'location/' + $scope.id + '/' + newStartPos;
        $scope.dataurl.prevUrl = 'location/' + $scope.id + '/' + prevStartPos;
    }
    
    $scope.data = "";
    
    /**
     * Again pulling the JSONP from drupal site to fetch and push location names
     * in fetched results from qbox
     */
    $http.jsonp("http://www.ssdkolkata.net/octopus/drupal/?q=location-json&callback=JSON_CALLBACK")
        .success(function(data){
            /**
             * If url contains location id, setting the dropdown name with the 
             * locations name
             */
            if($scope.type==='location'){
                angular.forEach(data.nodes, function (value,key) {
                    if(parseInt(value.node.term_id)===parseInt($scope.id)){
                        $('#filter_drop').html(value.node.name+'<span class="caret"></span>');
                    }
                });
            }
            $scope.data = {
                "mylocations": {}
            };
            $scope.data.mylocations.term = data.nodes;
            locationJson = $scope.data.mylocations;
            
            //  the qbox data source
            var ejs = ejsResource('http://6dc737d6002ed2be000.qbox.io');
            var oQuery = ejs.QueryStringQuery().defaultField('field_location');

            var client = ejs.Request()
                .indices('nodes');

            var searchQuery = '';
            
            /**
             * Crating the search query depending upon
             * -- location id from url
             * -- starting position of data, detected from url
             */
            if (typeof $scope.id === 'undefined' || $scope.id === 'all') {
                searchQuery = oQuery.query($scope.queryTerm || '*');
            } else {
                searchQuery = ejs.BoolQuery()
                    .must(ejs.TermQuery('field_location', $scope.id));
            }
            
            /**
             * Firing the search query just created above and setting the result
             * size to 10 as default 
             */
            $scope.results = client
                .query(searchQuery)
                .from(startFrom)
                .size('10')
                .doSearch();

            $scope.data = {
                "search_data": {}
            };
            
            /**
             * If the above query returns results loop through the same and push
             * location names in the result set. 
             */
            $scope.results.then(function (response) {
                $scope.data.search_data.term = response.hits.hits;
                $scope.status = "loaded "
                        + $scope.data.search_data.term.length
                        + " term.";
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
                angular.forEach(response.hits.hits, function (value, key) {
                    // getting the location id from resultset
                    var locid = parseInt(value._source.field_location); 
                    var locname = '';
                    var breakit = 0;
                    angular.forEach(locationJson, function (tvalue) {
                        angular.forEach(tvalue, function (lvalue) {
                            if (parseInt(lvalue.node.term_id) === locid) {
                                locname = lvalue.node.name;
                                breakit = 1;
                            }
                            if (breakit === 1) {
                                return false;
                            }
                        });
                        if (breakit === 1) {
                            return false;
                        }
                    });
                    // pushing the location name in the result json     
                    $scope.data.search_data.term[key].locname = locname;
                });
            });
        }).error(function (data, status, headers, config) {
            /**
             * Displaying message in console if there is any error during data 
             * fetching using JSONP
             */
            console.log("Unable to complete JSONP call for status = "+status);
        });
});