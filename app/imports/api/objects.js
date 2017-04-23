import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo';

import { Locations } from '/imports/api/locations.js'; 
import { getUserDescription } from '/imports/api/users.js'; 

export const Objects = new Mongo.Collection('objects');

export const StateSchema = new SimpleSchema({
  'state': {
    type: String,
    label: "State",
    defaultValue: 'available'
  },
  'userId': {
    type: String,
    label: "User Id",
    defaultValue: ''
  },
  'timestamp': {
    type: Number,
    label: "Timestamp",
    defaultValue: ''
  },
  'userDescription': {
    type: String,
    label: "Description",
    defaultValue: ''
  },
});

export const PriceSchema = new SimpleSchema({
  'value': {
    type: String,
    label: "Value",
    defaultValue: '0'
  },
  'currency': {
    type: String,
    label: "Currency",
    defaultValue: 'euro'
  },
  'timeunit': {
    type: String,
    label: "Timeunit",
    defaultValue: 'hour'
  },
  'description': {
    type: String,
    label: "Description",
    defaultValue: 'tijdelijk gratis'
  },
});

// TODO: make schema voor lock options

export const ObjectsSchema = new SimpleSchema({
  locationId: {
    type: String,
    label: "Location"
  },
  title: {
    type: String,
    label: "Title",
    max: 200
  },
  description: {
    type: String,
    label: "Description",
    optional: true,
  },
  imageUrl: {
    type: String,
    label: "Image URL",
    optional: true,
    max: 1000
  },
  state: {
    type: StateSchema
  },
  price: {
    type: PriceSchema
  },
  lock: {
    type: Object,
    blackbox: true
  }
});

if (Meteor.isServer) {
  Meteor.publish('objects', function objectsPublication() {
    return Objects.find();
  });
}

var getStateChangeNeatDescription = (objectTitle, newState) => {
  var description = ""
  if(newState=='reserved') {
    description = objectTitle + " gereserveerd"
  } else if(newState=='inuse') {
    description = objectTitle + " gehuurd"
  } else if(newState=='available') {
    description = objectTitle + " teruggebracht"
  } else if(newState=='outoforder') {
    description = objectTitle + " buiten bedrijf gesteld" 
  } else {
    description = objectTitle + " in toestand '" + newState + "' gezet"
  }

  return description;
}

export const createObject = (locationId, title) => { 
  // set SimpleSchema.debug to true to get more info about schema errors
  SimpleSchema.debug = true

  var timestamp =  new Date().valueOf();

  var length = 5;
  var base = Math.pow(10, length+1);
  var code = Math.floor(base + Math.random() * base)
  // console.log('code: ' + code);
  keycode = code.toString().substring(1, length+1);

  var data = {
    locationId: locationId,
    title: title,
    description: '',
    imageUrl: '/files/Block/bike.png',
    state: {state: 'available',
            userId: Meteor.userId(),
            timestamp: timestamp,
            userDescription: getUserDescription(Meteor.user())},
    lock: {type: 'plainkey',
           settings: {keyid: keycode }
          },
    price: {value: '0',
            currency: 'euro',
            timeunit: 'day',
            description: 'tijdelijk gratis'}
  }

  try {
    var context =  ObjectsSchema.newContext();
    check(data, ObjectsSchema);
  } catch(ex) {
    console.log('Error in data: ',ex.message );
    return;
  }

  return data;
}

Meteor.methods({
  'objects.insert'(data) {

    // Make sure the user is logged in
    if (! Meteor.userId()) throw new Meteor.Error('not-authorized');

    try {
      check(data, ObjectsSchema);
    } catch(ex) {
      console.log('data for new object does not match schema: ' + ex.message);
      return;
    }

  	// Strip HTML Tags
    data.title = data.title.replace(/<.*?>/g, " ").replace(/\s+/g, " ").trim();

    // Insert object
    var objectId = Objects.insert(data);

    // Add message to Slack: 'bike added!'
    var object = Objects.findOne(objectId, {title:1, locationId:1});
    var description = getUserDescription(Meteor.user()) + ' heeft een nieuwe fiets ' + object.title + ' toegevoegd';
    var slackmessage = 'Weer een nieuwe fiets toegevoegd'
    if(object.locationId) {
      var location = Locations.findOne(object.locationId, {title:1});
      description += ' op locatie ' + location.title;
      slackmessage += ' bij ' + location.title;
    }
    Meteor.call('transactions.addTransaction', 'ADD_OBJECT', description, Meteor.userId(), object.locationId, objectId, data);    
    Meteor.call('slack.sendnotification_commonbike',  slackmessage);

  },
  'objects.update'(objectId, data) {

    // Make sure the user is logged in
    if (! Meteor.userId()) throw new Meteor.Error('not-authorized');

    // check(data, ObjectsSchema);
	
	  var strippedTitle = data.title.replace(/<.*?>/g, " ").replace(/\s+/g, " ").trim();	

    Objects.update(objectId, {$set:{
      locationId: data.locationId,
      title: strippedTitle,
      description: data.description,
      imageUrl: data.imageUrl
    }});

    // op dit moment uitgeschakeld: door de reactive werking worden te veel transacties gelogd (bv bij het wijzigen van de titel van een fiets)

    // var object = Objects.findOne(objectId, {title:1, locationId:1});
    // var description = getUserDescription(Meteor.user()) + ' heeft de gegevens van fiets ' + object.title + ' gewijzigd';
    // if(object.locationId) {
    //   var location = Locations.findOne(object.locationId, {title:1});
    //   description += ' op locatie ' + location.title;
    // }
    // Meteor.call('transactions.addTransaction', 'CHANGE_OBJECT', description, Meteor.userId(), object.locationId, objectId, data);    
  },
  'objects.applychanges'(_id, changes) {

    // Make sure the user is logged in
    if (! Meteor.userId()) throw new Meteor.Error('not-authorized');

    var context =  ObjectsSchema.newContext();
    if(context.validate({ $set: changes}, {modifier: true} )) {
      Objects.update(_id, {$set : changes} );
    } else {
      console.log('unable to update object with id ' + _id);
      console.log(context);
    };
  },
  'objects.remove'(objectId){
    var object = Objects.findOne(objectId);

    Objects.remove(objectId);

    var description = getUserDescription(Meteor.user()) + ' heeft fiets ' + object.title + ' verwijderd';
    var slackmessage = 'Fiets verwijderd'
    if(object.locationId) {
      var location = Locations.findOne(object.locationId, {title:1});
      description += ' op locatie ' + location.title;
      slackmessage += ' bij ' + location.title;
    }
    Meteor.call('transactions.addTransaction', 'REMOVE_OBJECT', description, Meteor.userId(), object.locationId, object);    
    Meteor.call('slack.sendnotification_commonbike',  slackmessage);
  },
  'objects.setState'(objectId, userId, locationId, newState, userDescription){
    // Make sure the user is logged in
    if (! Meteor.userId()) throw new Meteor.Error('not-authorized');

    // console.log('setstate userDescription: ' + userDescription)

    var timestamp = new Date().valueOf();
    Objects.update({_id: objectId}, { $set: {
        'state.userId': userId,
        'state.state': newState,
        'state.timestamp': timestamp,
        'state.userDescription': userDescription||'anonymous' }
    });

    var object = Objects.findOne(objectId, {title:1});
    var description = getStateChangeNeatDescription(object.title, newState);
    Meteor.call('transactions.changeStateForObject', newState, description, objectId, locationId);    

    return;
  },
});