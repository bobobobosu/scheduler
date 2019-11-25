const express = require("express");
const path = require("path");
// use body parse for parsing POST request
const bodyParser = require("body-parser");
const app = express();
const port = 9200;
var request = require('request');
var fs = require('fs');
var watch = require('node-watch');
var Constants = JSON.parse(fs.readFileSync('C:\\_DATA\\_Storage\\_Sync\\Devices\\root\\Constants.json', 'utf8'));

// we'll use mysql for db access and util to promisify queries
const util = require("util");

// use your own parameters for database
const mysqlConfig = {
	"connectionLimit": 10,
	"host": "0.0.0.0",
	"user": "root",
	"password": "",
	"database": "scheduler_howto_node"
};

const helmet = require("helmet");
app.use(helmet());

// scheduler sends application/x-www-form-urlencoded requests,
app.use(bodyParser.urlencoded({ extended: true }));

// you'll need these headers if your API is deployed on a different domain than a public page
// in production system you could set Access-Control-Allow-Origin to your domains
// or drop this expression - by default CORS security is turned on in browsers
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	res.header("Access-Control-Allow-Methods", "*");
	next();
});

// return static pages from "./public" directory
app.use(express.static(__dirname + "/public"));

// General 
app.post('/msg/', (req, res) => {
	console.log(JSON.stringify(req.body));
	console.log("["+req.body['origin']+"] "+req.body['title']);
	console.log("=> "+req.body['body']);
	res.json({ ok: true });
  });

// BPMN
app.post('/bpmnsave/:id', (req, res) => {
	var path = Constants['Paths']['Folders']['BPMN'] + req.params.id+'.bpmn';
	fs.writeFile(path, req.body['data'], function (err) {
		if (err) throw err;
		console.log('BPMN saved');
	});
	res.json({ ok: true });
  });
app.get('/bpmn/:id/:milestone?', function(req, res) {
	var path = Constants['Paths']['Folders']['BPMN'] + req.params.id+'.bpmn';
	if (!fs.existsSync(path)) {
		fs.copyFile(__dirname+'/bpmnjs/starter/diagram.bpmn', path, (err) => {
			if (err) throw err;
		});
	}
	var htmlStr = fs.readFileSync(__dirname + "/bpmnjs/starter/modeler.html",'utf8');
	htmlStr = htmlStr.replace(/TASKNAME/g, req.params.id);
	htmlStr = htmlStr.replace(/CURRMILESTONE/g, (req.params.milestone)?(req.params.milestone):('xxxxx'));
	res.send(htmlStr);
});
app.get('/bpmnfile/:id', function(req, res) {
	var path = Constants['Paths']['Folders']['BPMN'] + req.params.id+'.bpmn';
	res.send(fs.readFileSync(path,'utf8'));
});

// DMN
app.post('/dmnsave/:id', (req, res) => {
	var path = Constants['Paths']['Folders']['DMN'] + req.params.id+'.dmn';
	fs.writeFile(path, req.body['data'], function (err) {
		if (err) throw err;
		console.log('DMN saved');
	});
	res.json({ ok: true });
  });
app.get('/dmn/:id', function(req, res) {
	var path = Constants['Paths']['Folders']['DMN'] + req.params.id+'.dmn';
	if (!fs.existsSync(path)) {
		fs.copyFile(__dirname+'/dmnjs/starter/diagram.dmn', path, (err) => {
			if (err) throw err;
		});
	}
	res.send(fs.readFileSync(__dirname + "/dmnjs/starter/modeler.html",'utf8').replace(/TASKNAME/g, req.params.id));
});
app.get('/dmnfile/:id', function(req, res) {
	var path = Constants['Paths']['Folders']['DMN'] + req.params.id+'.dmn';
	res.send(fs.readFileSync(path,'utf8'));
});



app.use("/codebase", express.static(path.join(__dirname, "..", "codebase")));
app.use("/samples", express.static(path.join(__dirname, "..", "samples")));
app.use(/^\/$/, function (req, res) {//default url
	res.redirect("/samples");
});

const router = require("./router");

// add listeners to basic CRUD requests
const Storage = require("./storage");
const eventsStorage = new Storage();
router.setRoutes(app, "/events", eventsStorage);

// File updates To Opta
self = this;
updateOptaFiles(this, genPathFromConstants('TimeHierarchyMap.json',Constants));
updateOptaFiles(this, genPathFromConstants('LocationHierarchyMap.json',Constants));
updateOptaFiles(this, genPathFromConstants('ValueEntryMap.json',Constants));
var watcher = watch(genPathFromConstants('TimeHierarchyMap.json',Constants), {
    recursive: true
}, function (evt, name) {
    console.log('%s changed.', name);
    updateOptaFiles(self, genPathFromConstants('TimeHierarchyMap.json',Constants));
});
var watcher = watch(genPathFromConstants('LocationHierarchyMap.json',Constants), {
    recursive: true
}, function (evt, name) {
    console.log('%s changed.', name);
    updateOptaFiles(self, genPathFromConstants('LocationHierarchyMap.json',Constants));
});

var watcher = watch(genPathFromConstants('ValueEntryMap.json',Constants), {
    recursive: true
}, function (evt, name) {
    console.log('%s changed.', name);
    updateOptaFiles(self, genPathFromConstants('ValueEntryMap.json',Constants));
});

// Recieve updates from Opta
getNewTimelineBlock(this);

// start server
app.listen(port, () => {
	console.log("Server is running on port " + port + "...");
});


function updateOptaFiles(self, filepath) {
	solver_address = Constants['Addresses']['solver_address'];
	//push update to optaplanner
	rawJson = JSON.parse(fs.readFileSync(filepath, 'utf8'));
	data = {};
	data[path.basename(filepath)] = rawJson;
	self = this;
	request.post({
		url: "http://" +solver_address + ":8080/updateOptaFiles",
		headers: {
			"Content-Type": "application/json"
		},
		body: data,
		json: true
	}, function (error, response, body) {
		// console.log(error);
		// console.log(body);
	});

}

function getNewTimelineBlock(self) {
	Constants = Constants;
	self = this;
	request.post({
		url: "http://" + Constants['Addresses']['solver_address'] + ":8080/newTimelineBlock",
		headers: {
			"Content-Type": "application/json"
		},
		body: {},
		json: true
	}, function (error, response, body) {
		if(!error){
			fs.writeFile(genPathFromConstants('TimelineBlock.json',Constants), JSON.stringify(body, null, 4), function (err) {
				if (err) throw err;
				console.log('New TimelineBlock from Opta');
			});
		}
		getNewTimelineBlock(self);
	});

}

function genPathFromConstants(filename,Constants) {
	return Constants['Paths']['Folders'][Constants['Paths']['Files'][filename]] + filename
}
