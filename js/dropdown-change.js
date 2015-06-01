/**
 * Jquery to change the location name in the dropdown button on select
 */
$(document).ready(function(){
    'use strict';
    $("body").delegate(".dropdown-menu li", "click", function() {
        $(this).parents(".btn-group").find('.btn').html($(this).text() + " <span class=\"caret\"></span>");
    });
});