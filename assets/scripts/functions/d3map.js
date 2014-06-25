function initMap(msg, data) {
    // Eyes wide open for this narly hack.
    // There are lots of different ways to put a D3 layer on Leaflet, and I found
    // them all to be annoying and/or weird. So, here I'm adding the topojson as a
    // regular leaflet layer so Leaflet can manage zooming/redrawing/events/etc. However,
    // I want D3 to manage symbolization et al, so I rely on the fact that Leaflet
    // adds the polys in the topojson order to add a data-id and geom class to the
    // layer so I can handle it D3-ish rather than through the Leaflet API.

    d3Layer = L.geoJson(topojson.feature(data.geom, data.geom.objects[neighborhoods]), {
        style: {
            "fillColor": "rgba(0,0,0,0)",
            "color": "none",
            "fillOpacity": 1
        }
    }).addTo(map);

    d3.selectAll(".leaflet-overlay-pane svg path").attr("class", "geom metric-hover").attr("data-id", function(d, i) {
        return data.geom.objects[neighborhoods].geometries[i].id;
    });

    d3Layer.on("click", function(d) {
        var sel = d3.select(".geom[data-id='" + d.layer.feature.id + "']");
        PubSub.publish('selectGeo', {
            "id": sel.attr("data-id"),
            "value": sel.attr("data-value"),
            "d3obj": sel
        });
    });

    $(".geom").on({
        mouseenter: function(){
            addHighlight($(this));
        },
        mouseleave: function(){
            removeHighlight($(this));
        }
    });

    $(".geom").tooltip({
        html: true,
        title: function() {
            var sel = $(this),
                num = "";
            if ($.isNumeric(sel.attr("data-value"))) {
                num = "<br>" + dataPretty(sel.attr("data-value"), $("#metric").val());
            }
            return "<p class='tip'><strong><span>District " + sel.attr("data-id") + "</strong>" + num + "</span></p>";
        },
        container: '#map'
    });

    // Here's where you would load other crap in your topojson for display purposes.
    // Change the styling here as desired.
    if (typeof overlay !== 'undefined') {
        L.geoJson(topojson.feature(data.geom, data.geom.objects[overlay]), {
            style: {
                "fillColor": "rgba(0,0,0,0)",
                "color": "white",
                "fillOpacity": 1,
                "opacity": 0.8,
                "weight": 3
            }
        }).addTo(map);
    }
}

function drawMap(msg, data) {
    var theMetric = $("#metric").val();
    var theGeom = d3.selectAll(".geom");

    // clear out quantile classes
    var classlist = [];
    for (i = 0; i < colorbreaks; i++) {
        classlist.push("q" + i);
    }
    theGeom.classed(classlist.join(" "), false);

    var theData = metricData[year].map;
    theGeom.each(function() {
        var item = d3.select(this);
        var styleClass = quantize(theData.get(item.attr('data-id')));
        if (!styleClass) {
            styleClass = "";
        }
        item.classed(styleClass, true)
            .attr("data-value", theData.get(item.attr('data-id')))
            .attr("data-quantile", quantize(theData.get(item.attr('data-id'))))
            .attr("data-toggle", "tooltip");
    });

    var xScale = d3.scale.linear().domain(x_extent).range([0, $("#barChart").parent().width() - 60]);

    var y = d3.scale.linear().range([260, 0]).domain([0, 260]);
}
