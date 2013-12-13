var map,
    quantize,
    x_extent,
    metricData = {},
    timer,
    year = "y_2012",
    barchartWidth;

PubSub.immediateExceptions = true;

d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
        this.parentNode.appendChild(this);
    });
};

function sliderChange(value) {
    $('.time-year').text(value);
    year = "y_" + value;
    PubSub.publish('changeYear');
}

$(document).ready(function () {

    // time slider
    $('.time-slider').slider({formater: function (value) { return value; }}).on('slideStop', function (ev) {
        sliderChange(ev.value);
    });

    $(".chosen-select").chosen({no_results_text: "Oops, nothing found!"});

    // time looper
    $(".btn-looper").on("click", function () {
        var that = $(this).children("span");
        if (that.hasClass("glyphicon-play")) {
            that.removeClass("glyphicon-play").addClass("glyphicon-pause");
            if ($('.time-slider').val() === "2010") {
                $('.time-slider').val("2012").slider('setValue', 2012);
            }
            else {
                $('.time-slider').val("2010").slider('setValue', 2010);
            }
            sliderChange($('.time-slider').val());
            timer = setInterval(function () {
                    if ($('.time-slider').val() === "2010") {
                        $('.time-slider').val("2012").slider('setValue', 2012);
                    }
                    else {
                        $('.time-slider').val("2010").slider('setValue', 2010);
                    }
                    sliderChange($('.time-slider').val());
                }, 3000);
        }
        else {
            that.removeClass("glyphicon-pause").addClass("glyphicon-play");
            clearInterval(timer);
        }
    });


    // subscriptions
    PubSub.subscribe('initializeMap', processMetric);
    PubSub.subscribe('initializeMap', drawMap);
    PubSub.subscribe('initializeMap', updateMeta);
    PubSub.subscribe('initializeBarChart', drawBarChart);
    PubSub.subscribe('changeYear', drawMap);
    PubSub.subscribe('changeYear', drawBarChart);
    PubSub.subscribe('changeMetric', processMetric);
    PubSub.subscribe('changeMetric', drawMap);
    PubSub.subscribe('changeMetric', drawBarChart);
    PubSub.subscribe('changeMetric', updateMeta);

    // set up map
    map = L.map("map", {
            zoomControl: false,
            attributionControl: false,
            minZoom: 9,
            maxZoom: 16
        }).setView([35.260, -80.827],10);
    // Mecklenburg Base Layer
    var baseTiles = L.tileLayer("http://maps.co.mecklenburg.nc.us/tiles/nmeckbase/{y}/{x}/{z}.png");

    // var Esri_WorldGrayCanvas = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    //     attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    //     maxZoom: 16
    // }).addTo(map);

    L.control.layers( {} , {"Base Map": baseTiles}).addTo(map);
    map.on('overlayadd',function(e){
        // test for e.name === "Base Map"
        $(".neighborhoods path").css("opacity", "0.7");
    });
    map.on('overlayremove',function(e){
        $(".neighborhoods path").css("opacity", "1");
    });


    queue()
        .defer(d3.json, "data/npa.topo.json")
        .defer(d3.csv, "data/metric/" + $("#metric").val() + ".csv")
        .await(draw);

    $("#metric").change(function () {
        d3.csv("data/metric/" + $(this).val() + ".csv", changeMetric);
    });

    d3.select(window).on("resize", function () {
        if ($(".barchart").parent().width() !== barchartWidth) {
            drawBarChart();
        }
    });


});

function draw(error, neighborhoods, data) {
    PubSub.publish('initializeMap', {
        "neighborhoods": neighborhoods,
        "metricdata": data,
        'metric': $("#metric").val()
    });
    PubSub.publish('initializeBarChart', {
        "metricdata": data
    });
}

function changeMetric(error, data) {
    PubSub.publish('changeMetric', {
        'metricdata': data,
        'metric': $("#metric").val()
    });
}

function updateMeta(msg, d) {
    $.ajax({
        url: 'data/meta/' + d.metric + '.md',
        type: 'GET',
        dataType: 'text',
        success: function (data) {
            var converter = new Markdown.Converter();
            var html = converter.makeHtml(data);
            var parsedhtml = $('<div/>').append(html);
            $('.meta-resources ul').html(parsedhtml.find("ul").html());
            $('.meta-important').html(parsedhtml.find("p:eq(1)").html());
            $('.meta-about').html("<p>" + parsedhtml.find("p:eq(2)").html() + "</p>");
            $('.meta-about').append("<p>" + parsedhtml.find("p:eq(3)").html() + "</p>");
        },
        error: function (error, status, desc) {
            console.log(status, desc);
        }
    });
}

function processMetric(msg, data) {
    // break out years into maps
    var y_2012 = d3.map(),
        y_2010 = d3.map();

    _.each(data.metricdata, function (d) {
        if ($.isNumeric(d.y_2010)) { y_2010.set(d.id, +d.y_2010); }
        if ($.isNumeric(d.y_2012)) { y_2012.set(d.id, +d.y_2012); }
    });

    metricData = {
        "y_2010": y_2010,
        "y_2012": y_2012
    };

    // Set up extents
    x_extent = d3.extent(y_2012.values().concat(y_2010.values()));

    // set up quantile
    quantize = d3.scale.quantile()
        .domain(x_extent)
        .range(d3.range(9).map(function (i) {
            return "q" + i;
        }));
}

function quantizeCount(data) {
    var q1 = _.countBy(data, function (d) {
        return quantize(d);
    });
    var q2 = [];
    for (var i = 0; i <= 8; i++) {
        if (!q1["q" + i]) { q1["q" + i] = 0; }
        q2.push({
            "key": "q" + i,
            "value": q1["q" + i]
        });
    }
    return q2;
}

function d3Highlight(vis, q, add) {
    var sel = d3.selectAll(vis + " ." + q + "-9");
    if (add === true) {
        sel.classed("d3-highlight", true);
        if (vis === ".neighborhoods") { sel.moveToFront(); }
    } else {
        sel.classed("d3-highlight", false);
    }
}


