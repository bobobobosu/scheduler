require("date-format-lite"); // add date format
var fs = require('fs');
var watch = require('node-watch');
var Constants = JSON.parse(fs.readFileSync('C:\\_DATA\\_Storage\\_Sync\\Devices\\root\\Constants.json', 'utf8'));

var xssFilters = require('xss-filters');

class Storage {
	constructor() {
		this.table = JSON.parse(fs.readFileSync(genPathFromConstants('Events.json',Constants), 'utf8'));
		fs.writeFile(genPathFromConstants('TimelineBlock.json',Constants),"", function (err) {
		});
		this.idcounter = -1;
	}

	// get events from the table, use dynamic loading if parameters sent
	async getAll(params) {
		this.table = JSON.parse(fs.readFileSync(genPathFromConstants('Events.json',Constants), 'utf8'));
		fs.writeFile(genPathFromConstants('TimelineBlock.json',Constants),"", function (err) {
		});
		console.log('Calendar Updated');
		return this.table;
	}

	// create new event
	async insert(data) {
		// Update id
		var id = this.idcounter--
		var timelineEntry = {
			'id' : parseInt(id),
			'task' : data.task,
			'description' : data.description,
			'startTime': new Date(data['start_date']).toLocaleString(),
			'humanStateChange' : {
				'duration' : (new Date(data['end_date']).getTime() - 
								new Date(data['start_date']).getTime())/(1000*60)
			},
			'movable':0
		}
		saveTimelineBlock(timelineEntry)
		console.log(id + " inserted");
		return {
			action: "inserted",
			tid: id
		}
	}

	// update event
	async update(id, data) {
		console.log(id + " updated");
		var timelineEntry = {
			'id' : parseInt(id),
			'task' : data.task,
			'description' : data.description,
			'startTime': new Date(data['start_date']).toLocaleString(),
			'humanStateChange' : {
				'duration' : (new Date(data['end_date']).getTime() - 
								new Date(data['start_date']).getTime())/(1000*60)
			},
			'movable':0
		}
		saveTimelineBlock(timelineEntry)
		
		return {
			action: "updated"
		}
	}

	// delete event
	async delete(id) {
		console.log(id + " deleted");

		var timelineEntry = {
			'id' : parseInt(id),
			'rownum':9999
		}
		saveTimelineBlock(timelineEntry)

		return {
			action: "deleted"
		}
	}
}

module.exports = Storage;


function genPathFromConstants(filename,Constants) {
	return Constants['Paths']['Folders'][Constants['Paths']['Files'][filename]] + filename
}

function saveTimelineBlock(timelineEntry){
	path = genPathFromConstants('TimelineBlock.json',Constants);
	var timelineBlock;
	timelineBlock = {
		"timelineEntryList": [],
		"origin": "scheduler"
	}

	try {
		if (fs.existsSync(path)) {
			filetimelineBlock = JSON.parse(fs.readFileSync(path, 'utf8'));
			if(filetimelineBlock['origin'] == "scheduler"){
				timelineBlock = filetimelineBlock
			}
		}
	}catch(err) {
	}finally {
	}

	//Append
	var idx = timelineBlock.timelineEntryList.findIndex(function(element) {
		return element.id == timelineEntry.id;
	});

	if(idx == -1){
		timelineBlock.timelineEntryList.push(timelineEntry);
	}else{
		timelineBlock.timelineEntryList[idx] = timelineEntry
	}
	
	fs.writeFile(genPathFromConstants('TimelineBlock.json',Constants), JSON.stringify(timelineBlock, null, 4), function (err) {
		if (err) throw err;
		console.log('New TimelineBlock');
	});
}