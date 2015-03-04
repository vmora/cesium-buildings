///*global define*/
//define('TileProvider', [
//        'WfsGeometry'
//    ], function(
//        BoundingSphere,
//        Cartesian3,
//        ComponentDatatype,
//        defaultValue,
//        defined,
//        DeveloperError,
//        Geometry,
//        GeometryAttribute,
//        GeometryAttributes,
//        GeometryPipeline,
//        PrimitiveType,
//        VertexFormat) {
//    "use strict";

var TileProvider = function TileProvider() {
    this._quadtree = undefined;
    this._tilingScheme = new Cesium.GeographicTilingScheme();
    this._errorEvent = new Cesium.Event();
    this._levelZeroMaximumError = Cesium.QuadtreeTileProvider.computeDefaultLevelZeroMaximumGeometricError(this._tilingScheme);

    //this._worker = new Worker('createWfsGeometry.js');
    //this._worker.postMessage('Hello from main');
    //myWorker.onmessage = function(e) {console.log('recieved from worker: ', e.data);};

};

Object.defineProperties(TileProvider.prototype, {
    quadtree : {
        get : function() {
            return this._quadtree;
        },
        set : function(value) {
            this._quadtree = value;
        }
    },

    ready : {
        get : function() {
            return true;
        }
    },

    tilingScheme : {
        get : function() {
            return this._tilingScheme;
        }
    },

    errorEvent : {
        get : function() {
            return this._errorEvent;
        }
    }
});

TileProvider.prototype.beginUpdate = function(context, frameState, commandList) {
};

TileProvider.prototype.endUpdate = function(context, frameState, commandList) {
};

TileProvider.prototype.getLevelMaximumGeometricError = function(level) {
    return this._levelZeroMaximumError / (1 << level);
};

TileProvider.prototype.loadTile = function(context, frameState, tile) {
    if (tile.state === Cesium.QuadtreeTileLoadState.START) {
        tile.data = {
            primitive : undefined,
            freeResources : function() {
                if (Cesium.defined(this.primitive)) {
                    this.primitive.destroy();
                    this.primitive = undefined;
                }
            }
        };

var load = function(that, geoJson, sourceUri, options) {

    var primCol = new Cesium.PrimitiveCollection();
    var texRe = /\((.*),"(.*)"\)/;

    //console.log("loading features", geoJson.features.length);
    for (var f=0; f < geoJson.features.length; f++){
        var texP = texRe.exec(geoJson.features[f].properties.tex);
        var arrJson = texP[2].replace(/{/g,"[").replace(/}/g,"]")
        var st = JSON.parse(arrJson);
        var coord = geoJson.features[f].geometry.coordinates
        var geom = new WfsGeometry({
              position: coord,
              st : st
              });

        var mat = new Cesium.Material({
                fabric : {
                    type : 'DiffuseMap',
                    uniforms : {
                        image : texture_dir+texP[1]
                    }
                }
            });
        primCol.add(new Cesium.Primitive({
              geometryInstances : new Cesium.GeometryInstance({ 
                  geometry : geom
                  }),
              appearance : new Cesium.MaterialAppearance({
                  material : mat,//Cesium.Material.fromType('Color'),
                  color : Cesium.Color.fromBytes(255, 0, 0, 255),
                  faceForward : true
                }),
              asynchronous : false 
          }));
    }



  if (primCol.length){
      options.tile.data.primitive = primCol;
   }else{
    var color = Cesium.Color.fromBytes(0, 0, 255, 255);
    options.tile.data.primitive = new Cesium.Primitive({
        geometryInstances : new Cesium.GeometryInstance({
            geometry : new Cesium.RectangleOutlineGeometry({
                rectangle : options.tile.rectangle
            }),
            attributes : {
                color : Cesium.ColorGeometryInstanceAttribute.fromColor(color)
            }
        }),
        appearance : new Cesium.PerInstanceColorAppearance({
            flat : true
        })
    });
  
   }

  options.tile.data.boundingSphere3D = Cesium.BoundingSphere.fromRectangle3D(options.tile.rectangle);
  options.tile.data.boundingSphere2D = Cesium.BoundingSphere.fromRectangle2D(options.tile.rectangle, frameState.mapProjection);
  Cesium.Cartesian3.fromElements(options.tile.data.boundingSphere2D.center.z, options.tile.data.boundingSphere2D.center.x, options.tile.data.boundingSphere2D.center.y, options.tile.data.boundingSphere2D.center);
  options.tile.data.primitive.update(options.context, options.frameState, []);
  options.tile.state = Cesium.QuadtreeTileLoadState.DONE;
  options.tile.renderable = true;
};


var loadUrl = function(url, options) {
    var that = this;
    Cesium.when(Cesium.loadJson(url), function(geoJson) {
        load(tile, geoJson, url, options);
    }).otherwise(function(error) {
        that._error.raiseEvent(that, error);
        Cesium.when.reject(error);
    });
};

var DEGREES_PER_RADIAN = 180.0 / Math.PI;
var RADIAN_PER_DEGREEE = 1 / DEGREES_PER_RADIAN;
var centroidGid1 = {lat:4.85313065565722*RADIAN_PER_DEGREEE, lon: 45.758225029663};

if ( Math.abs(tile.rectangle.south - tile.rectangle.north) < .00005 ){
          tile.state = Cesium.QuadtreeTileLoadState.LOADING;
          //loadUrl("http://localhost/cgi-bin/tinyows?SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&outputFormat=JSON&typeName=tows:textured_citygml_lat_long&srsName=EPSG:4326&featureId=1",{tile : tile, context : context, frameState : frameState});
          loadUrl("http://localhost/cgi-bin/tinyows?SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&outputFormat=JSON&typeName=tows:textured_citygml_lat_long&srsName=EPSG:4326&BBOX="+
              DEGREES_PER_RADIAN*tile.rectangle.west+","+
              DEGREES_PER_RADIAN*tile.rectangle.south+","+
              DEGREES_PER_RADIAN*tile.rectangle.east+","+
              DEGREES_PER_RADIAN*tile.rectangle.north, {tile : tile, context : context, frameState : frameState});
}
else{
  //console.debug(Math.abs(tile.rectangle.south - tile.rectangle.north));
    var color = Cesium.Color.fromBytes(255, 0, 0, 255);
    tile.data.primitive = new Cesium.Primitive({
        geometryInstances : new Cesium.GeometryInstance({
            geometry : new Cesium.RectangleOutlineGeometry({
                rectangle : tile.rectangle
            }),
            attributes : {
                color : Cesium.ColorGeometryInstanceAttribute.fromColor(color)
            }
        }),
        appearance : new Cesium.PerInstanceColorAppearance({
            flat : true
        })
    });

    tile.data.boundingSphere3D = Cesium.BoundingSphere.fromRectangle3D(tile.rectangle);
    tile.data.boundingSphere2D = Cesium.BoundingSphere.fromRectangle2D(tile.rectangle, frameState.mapProjection);
    Cesium.Cartesian3.fromElements(tile.data.boundingSphere2D.center.z, tile.data.boundingSphere2D.center.x, tile.data.boundingSphere2D.center.y, tile.data.boundingSphere2D.center);

    tile.data.primitive.update(context, frameState, []);
    tile.state = Cesium.QuadtreeTileLoadState.DONE;
    tile.renderable = true;
}


    }

    //if (tile.state === Cesium.QuadtreeTileLoadState.LOADING) {
    //    tile.data.primitive.update(context, frameState, []);
    //    if (tile.data.primitive.ready) {
    //        tile.state = Cesium.QuadtreeTileLoadState.DONE;
    //        tile.renderable = true;
    //    }
    //}
};

TileProvider.prototype.computeTileVisibility = function(tile, frameState, occluders) {
    var boundingSphere;
    if (frameState.mode === Cesium.SceneMode.SCENE3D) {
        boundingSphere = tile.data.boundingSphere3D;
    } else {
        boundingSphere = tile.data.boundingSphere2D;
    }

    return frameState.cullingVolume.computeVisibility(boundingSphere);
};

TileProvider.prototype.showTileThisFrame = function(tile, context, frameState, commandList) {
    tile.data.primitive.update(context, frameState, commandList);
};

var subtractScratch = new Cesium.Cartesian3();

TileProvider.prototype.computeDistanceToTile = function(tile, frameState) {
    var boundingSphere;

    if (frameState.mode === Cesium.SceneMode.SCENE3D) {
        boundingSphere = tile.data.boundingSphere3D;
    } else {
        boundingSphere = tile.data.boundingSphere2D;
    }

    return Math.max(0.0, Cesium.Cartesian3.magnitude(Cesium.Cartesian3.subtract(boundingSphere.center, frameState.camera.positionWC, subtractScratch)) - boundingSphere.radius);
};

TileProvider.prototype.isDestroyed = function() {
    return false;
};

TileProvider.prototype.destroy = function() {
    return Cesium.destroyObject(this);
};

//return TileProvider;
//});
