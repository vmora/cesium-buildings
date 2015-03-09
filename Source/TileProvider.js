/* The tile will be empty if the tile size (north->south) is below minSize or above maxsize
 */

function geometryFromArrays(data){
    var attributes = new Cesium.GeometryAttributes();
    attributes.position  = new Cesium.GeometryAttribute({
        componentDatatype : Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute : 3,
        values : data.position
    });
    attributes.st  = new Cesium.GeometryAttribute({
        componentDatatype : Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute : 2,
        values : data.st
    });
    attributes.normal = new Cesium.GeometryAttribute({
        componentDatatype : Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute : 3,
        values : data.normal
    });
    attributes.tangent = new Cesium.GeometryAttribute({
        componentDatatype : Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute : 3,
        values : data.normal
    });
    attributes.binormal = new Cesium.GeometryAttribute({
        componentDatatype : Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute : 3,
        values : data.normal
    });
    
    var center = new Cesium.Cartesian3(data.center[0], data.center[1], data.center[2]);
    return new Cesium.Geometry({
        attributes : attributes,
        indices : data.indices,
        primitiveType : Cesium.PrimitiveType.TRIANGLES,
        boundingSphere : new Cesium.BoundingSphere(center, data.radius)
    });
}

function WfsTileProvider(url, layerName, minSizeMeters, maxSizeMeters) {
    this._quadtree = undefined;
    this._tilingScheme = new Cesium.GeographicTilingScheme();
    this._errorEvent = new Cesium.Event();
    this._levelZeroMaximumError = Cesium.QuadtreeTileProvider.computeDefaultLevelZeroMaximumGeometricError(this._tilingScheme);

    this._workQueue = new WorkQueue('../Source/createWfsGeometry.js');
    this._url = url
    this._minSizeMeters = minSizeMeters
    this._maxSizeMeters = maxSizeMeters
};

Object.defineProperties(WfsTileProvider.prototype, {
    quadtree: {
        get: function() {
            return this._quadtree;
        },
        set: function(value) {
            this._quadtree = value;
        }
    },

    ready: {
        get: function() {
            return true;
        }
    },

    tilingScheme: {
        get: function() {
            return this._tilingScheme;
        }
    },

    errorEvent: {
        get: function() {
            return this._errorEvent;
        }
    }
});

WfsTileProvider.prototype.beginUpdate = function(context, frameState, commandList) {};

WfsTileProvider.prototype.endUpdate = function(context, frameState, commandList) {};

WfsTileProvider.prototype.getLevelMaximumGeometricError = function(level) {
    return this._levelZeroMaximumError / (1 << level);
};

var DEGREES_PER_RADIAN = 180.0 / Math.PI;
var RADIAN_PER_DEGREEE = 1 / DEGREES_PER_RADIAN;

WfsTileProvider.prototype.placeHolder = function(tile, red) {
    var color = Cesium.Color.fromBytes(0, 0, 255, 255);
    if (red){
        color = Cesium.Color.fromBytes(255, 0, 0, 255);
    }
    tile.data.primitive = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.RectangleOutlineGeometry({
                rectangle: tile.rectangle
            }),
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
            }
        }),
        appearance: new Cesium.PerInstanceColorAppearance({
            flat: true
        })
    });
};

WfsTileProvider.prototype.loadTile = function(context, frameState, tile) {
    if (tile.state === Cesium.QuadtreeTileLoadState.START) {
        tile.data = {
            primitive: undefined,
            freeResources: function() {
                if (Cesium.defined(this.primitive)) {
                    this.primitive.destroy();
                    this.primitive = undefined;
                }
            }
        };

        var earthRadius = 6371000;
        var tileSizeMeters = Math.abs(earthRadius*(tile.rectangle.south - tile.rectangle.north));

        if (this._minSizeMeters < tileSizeMeters && tileSizeMeters < this._maxSizeMeters) {
            tile.state = Cesium.QuadtreeTileLoadState.LOADING;
            var request = this._url+
                    '?SERVICE=WFS'+
                    '&VERSION=1.0.0'+
                    '&REQUEST=GetFeature'+
                    '&outputFormat=JSON'+
                    '&typeName='+this._layerName+
                    '&srsName=EPSG:4326'+
                    '&BBOX='+
                        DEGREES_PER_RADIAN * tile.rectangle.west + "," +
                        DEGREES_PER_RADIAN * tile.rectangle.south + "," +
                        DEGREES_PER_RADIAN * tile.rectangle.east + "," +
                        DEGREES_PER_RADIAN * tile.rectangle.north;

            var that = this;
            var primCol = new Cesium.PrimitiveCollection();
            this._workQueue.addTask(request, 
                    function(w){
                        if (w.data != 'done'){
                            primCol.add(new Cesium.Primitive({
                                geometryInstances: new Cesium.GeometryInstance({
                                    geometry: geometryFromArrays(w.data)
                                }),
                                appearance : new Cesium.MaterialAppearance({
                                    color : Cesium.Color.fromBytes(255, 0, 0, 255),
                                    faceForward : true
                                  }),
                                asynchronous : false
                            }));
                            return true;
                        }
                        tile.data.primitive = primCol;
                        tile.data.boundingSphere3D = Cesium.BoundingSphere.fromRectangle3D(tile.rectangle);
                        tile.data.boundingSphere2D = Cesium.BoundingSphere.fromRectangle2D(tile.rectangle, frameState.mapProjection);
                        Cesium.Cartesian3.fromElements(tile.data.boundingSphere2D.center.z, tile.data.boundingSphere2D.center.x, tile.data.boundingSphere2D.center.y, tile.data.boundingSphere2D.center);

                        tile.data.primitive.update(context, frameState, []);
                        tile.state = Cesium.QuadtreeTileLoadState.DONE;
                        tile.renderable = true;
                        return false;
                    });
        } else {
            this.placeHolder(tile);
            tile.data.boundingSphere3D = Cesium.BoundingSphere.fromRectangle3D(tile.rectangle);
            tile.data.boundingSphere2D = Cesium.BoundingSphere.fromRectangle2D(tile.rectangle, frameState.mapProjection);
            Cesium.Cartesian3.fromElements(tile.data.boundingSphere2D.center.z, tile.data.boundingSphere2D.center.x, tile.data.boundingSphere2D.center.y, tile.data.boundingSphere2D.center);

            tile.data.primitive.update(context, frameState, []);
            tile.state = Cesium.QuadtreeTileLoadState.DONE;
            tile.renderable = true;
        }
    }
};

WfsTileProvider.prototype.computeTileVisibility = function(tile, frameState, occluders) {
    var boundingSphere;
    if (frameState.mode === Cesium.SceneMode.SCENE3D) {
        boundingSphere = tile.data.boundingSphere3D;
    } else {
        boundingSphere = tile.data.boundingSphere2D;
    }
    return frameState.cullingVolume.computeVisibility(boundingSphere);
};

WfsTileProvider.prototype.showTileThisFrame = function(tile, context, frameState, commandList) {
    tile.data.primitive.update(context, frameState, commandList);
};

var subtractScratch = new Cesium.Cartesian3();

WfsTileProvider.prototype.computeDistanceToTile = function(tile, frameState) {
    var boundingSphere;
    if (frameState.mode === Cesium.SceneMode.SCENE3D) {
        boundingSphere = tile.data.boundingSphere3D;
    } else {
        boundingSphere = tile.data.boundingSphere2D;
    }
    return Math.max(0.0, Cesium.Cartesian3.magnitude(Cesium.Cartesian3.subtract(boundingSphere.center, frameState.camera.positionWC, subtractScratch)) - boundingSphere.radius);
};

WfsTileProvider.prototype.isDestroyed = function() {
    return false;
};

WfsTileProvider.prototype.destroy = function() {
    return Cesium.destroyObject(this);
};
