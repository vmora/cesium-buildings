/* This worker thread receives messages containing urls of wfs data
 * it will send a message for each loaded feature:
 * {originUrl:url, properties, position, st, indices, normals, binormals, tangent}
 * the properties are a json string that can be parsed by the caller
 * once the url features have been exhausted, the folowing message is sent:
 * 'done'
 */

//importScripts('../../cesium/Cesium.js');
//importScripts('../Source/WfsGeometry.js');
//importScripts('//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js')

// simple url loader in pure javascript
function load(url, callback) {
    var xhr;

    if (typeof XMLHttpRequest !== 'undefined') xhr = new XMLHttpRequest();
    else {
        var versions = ["MSXML2.XmlHttp.5.0",
            "MSXML2.XmlHttp.4.0",
            "MSXML2.XmlHttp.3.0",
            "MSXML2.XmlHttp.2.0",
            "Microsoft.XmlHttp"
        ];

        for (var i = 0, len = versions.length; i < len; i++) {
            try {
                xhr = new ActiveXObject(versions[i]);
                break;
            } catch (e) {}
        } // end for
    }
    xhr.onreadystatechange = ensureReadiness;

    function ensureReadiness() {
        if (xhr.readyState < 4) {
            return;
        }
        if (xhr.status !== 200) {
            return;
        }

        // all is well
        if (xhr.readyState === 4) {
            callback(xhr);
        }
    }
    xhr.open('GET', url, true);
    xhr.send('');
}


var wgs84RadiiSquared = [6378137.0 * 6378137.0, 6378137.0 * 6378137.0, 6356752.3142451793 * 6356752.3142451793];
var DEGREES_PER_RADIAN = 180.0 / Math.PI;
var RADIAN_PER_DEGREEE = 1 / DEGREES_PER_RADIAN;
function cartesianFromDregree(longitude, latitude, height) {

    var lat = latitude*RADIAN_PER_DEGREEE;
    var lon = longitude*RADIAN_PER_DEGREEE;
    var cosLatitude = Math.cos(lat);
    var scratchN = [cosLatitude * Math.cos(lon),
                    cosLatitude * Math.sin(lon),
                    Math.sin(lat)];
    var magN = Math.sqrt( scratchN[0]*scratchN[0] +
                          scratchN[1]*scratchN[1] +
                          scratchN[2]*scratchN[2]);
    scratchN[0] /= magN;
    scratchN[1] /= magN;
    scratchN[2] /= magN;

    var scratchK = [wgs84RadiiSquared[0]*scratchN[0],
                    wgs84RadiiSquared[1]*scratchN[1],
                    wgs84RadiiSquared[2]*scratchN[2]];

    var gamma = Math.sqrt(scratchN[0]*scratchK[0] +
                          scratchN[1]*scratchK[1] +
                          scratchN[2]*scratchK[2]);

    scratchK[0] /= gamma;
    scratchK[1] /= gamma;
    scratchK[2] /= gamma;
    scratchN[0] *= height;
    scratchN[1] *= height;
    scratchN[2] *= height;
    return [scratchK[0]+scratchN[0],
            scratchK[1]+scratchN[1],
            scratchK[2]+scratchN[2]];
}

/*
        var load = function(that, geoJson, sourceUri, options) {

            var primCol = new Cesium.PrimitiveCollection();
            var texRe = /\((.*),"(.*)"\)/;

            //console.log("loading features", geoJson.features.length);
            for (var f = 0; f < geoJson.features.length; f++) {
                var texP = texRe.exec(geoJson.features[f].properties.tex);
                var arrJson = texP[2].replace(/{/g, "[").replace(/}/g, "]")
                var st = JSON.parse(arrJson);
                var coord = geoJson.features[f].geometry.coordinates
                var geom = new WfsGeometry({
                    position: coord,
                    st: st
                });

                var mat = new Cesium.Material({
                    fabric: {
                        type: 'DiffuseMap',
                        uniforms: {
                            image: texture_dir + texP[1]
                        }
                    }
                });
                primCol.add(new Cesium.Primitive({
                    geometryInstances: new Cesium.GeometryInstance({
                        geometry: geom
                    }),
                    appearance: new Cesium.MaterialAppearance({
                        material: mat, //Cesium.Material.fromType('Color'),
                        color: Cesium.Color.fromBytes(255, 0, 0, 255),
                        faceForward: true
                    }),
                    asynchronous: false
                }));
            }


            if (primCol.length) {
                options.tile.data.primitive = primCol;
            } else {
                this.placeHolder(options.tile)
            }

            options.tile.data.boundingSphere3D = Cesium.BoundingSphere.fromRectangle3D(options.tile.rectangle);
            options.tile.data.boundingSphere2D = Cesium.BoundingSphere.fromRectangle2D(options.tile.rectangle, frameState.mapProjection);
            Cesium.Cartesian3.fromElements(options.tile.data.boundingSphere2D.center.z, options.tile.data.boundingSphere2D.center.x, options.tile.data.boundingSphere2D.center.y, options.tile.data.boundingSphere2D.center);
            options.tile.data.primitive.update(options.context, options.frameState, []);
            options.tile.state = Cesium.QuadtreeTileLoadState.DONE;
            options.tile.renderable = true;
        };
*/

onmessage = function(o) {

    //load(o.data, function(xhr) {
    //    var result = xhr.responseText;
    //    postMessage({m:'hello'})
    //    //postMessage({position:position, st:st, indices:indices})
    //    });
    var i;
    var A = cartesianFromDregree(4.84, 45.74, 50); 
    var B = cartesianFromDregree(4.86, 45.74, 50); 
    var C = cartesianFromDregree(4.86, 45.76, 50); 
    var D = cartesianFromDregree(4.84, 45.76, 50); 

    //var A = [4443197.097834845, 376229.67805021134, 4545161.541107168];
    //var B = [4443065.498209954, 377780.6234709375, 4545161.541107168];
    //var C = [4441478.922403821, 377645.72165653337, 4546712.691703641];
    //var D = [4441610.475035757, 376095.33006344765, 4546712.691703641];

    var pos =[A[0], A[1], A[2],
              B[0], B[1], B[2],
              C[0], C[1], C[2],
              D[0], D[1], D[2],
             ];
    var position = new  Float64Array(pos.length);
    for (i = 0; i < position.length; i++) position[i] = pos[i];
    
    var ind = [0, 1, 2, 0, 2, 3];
    var indices = new Uint16Array(6);
    for (i = 0; i < 6; i++) indices[i] = ind[i];

    var normal = new  Float32Array(pos.length);
    for (i = 0; i < normal.length; i++) normal[i] = (i+1)%3 ? 0 : 1;

    var binormal = new Float32Array(pos.length);
    for (i = 0; i < binormal.length; i++) binormal[i] = (i+2)%3 ? 0 : 1;

    var tangent = new Float32Array(pos.length);
    for (i = 0; i < tangent.length; i++) tangent[i] = (i+3)%3 ? 0 : 1;

    var tex = [0,0,
              1,0,
              1,1,
              0,1];
    var st = new  Float32Array(tex.length);
    for (i = 0; i < st.length; i++) st[i] = tex[i];

    var center = new Float32Array(3);
    center[0] = 0.5*(pos[0]+ pos[3]);
    center[1] = 0.5*(pos[1]+ pos[7]);
    center[2] = pos[2];
    radius = 0.5*Math.abs(pos[3] - pos[0]);

    postMessage({position:position, normal:normal, tangent:tangent, binormal:binormal, center:center, radius:radius, st:st, indices:indices}, [position.buffer, normal.buffer, tangent.buffer, binormal.buffer, center.buffer, st.buffer, indices.buffer]);
    postMessage('done');
};
