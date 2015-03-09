/** Deals with workers that can send multiple response after sending
 * an initial message 
 */
function WorkQueue(workerUrl, nbWorkers){
    var W = nbWorkers || 1;
    this._workers = [];
    for (var w=0; w<W; w++){
        this._workers.push(new Worker(workerUrl));
    } 
    this._tasks = [];
    this._currentWorker = 0;
};

WorkQueue.prototype._updateWorkers = function(){
    // if a worker is free, dequeue
    for (var w=0; w<this._workers.length; w++){
        if (this._workers[w].onmessage == null){ 
            var worker = this._workers[w];
            var task = this._tasks.shift();
            if (typeof task != 'undefined'){
                var that = this;
                worker.onmessage = (function(task, worker){
                        return function(m){
                        if (!task.callback(m)){
                            worker.onmessage = null;
                            that._updateWorkers();
                        }};})(task, worker);
                worker.postMessage(task.msg);
            }
        }
    }
};

// the callback function must return false when it's done
WorkQueue.prototype.addTask = function(message, callback){
    // the function is called each time a thread finishes
    this._tasks.push({msg:message, callback:callback});
    this._updateWorkers();
};

