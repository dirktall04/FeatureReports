define(['dojo/_base/declare',
      'dojo/_base/lang',
      'jimu/BaseWidget',
      "esri/InfoTemplate",
      "esri/map",
      "esri/layers/layer",
      "esri/layers/GraphicsLayer",
      "esri/layers/FeatureLayer",
      "esri/symbols/SimpleFillSymbol",
      "esri/symbols/SimpleLineSymbol",
      "esri/symbols/SimpleMarkerSymbol",
      "esri/symbols/PictureMarkerSymbol",
      "esri/renderers/SimpleRenderer",
      "esri/tasks/query",
      "esri/toolbars/draw",
      "dojo/dom",
      "dojo/on",
      "dojo/parser",
      "dojo/_base/array",
      "esri/Color",
      "dijit/form/Button",
      "dijit/_TemplatedMixin",
      "dijit/_WidgetsInTemplateMixin",
      "dojox/json/ref",
      "dojo/dom-attr",
      "dojo/dom-construct",
      "dijit/registry",
      "dojo/store/Memory",
      "dojo/text!./reportingLayersConfig.json", // This seems to be the correct way to do it.
      "require",
      "dojo/domReady!"
      ],
  function(declare, lang, _BaseWidget, InfoTemplate, Map, EsriLayer, GraphicsLayer,
          FeatureLayer, SimpleFillSymbol,
          SimpleLineSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, SimpleRenderer,
          Query, Draw, dom, on, parser, arrayUtil, Color, Button, _TemplatedMixin, 
          _WidgetsInTemplatedMixin, json, domAttr, domConstruct, registry,
          Memory, reportingLayersConfig,
          require
    ) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([_BaseWidget, _TemplatedMixin, _WidgetsInTemplatedMixin], {

      baseClass: 'jimu-widget-featurereports',
      name: 'FeatureReports',
      //startNewSelected: null,
      _featureWebiLink1stPart: null,
      _featureWebiLink2ndPart: null,
      _featureWebiLink3rdPart: null,
      _featureWebiLinkBase: null,
      _mapFeature: null,
      _featureItemsLayer: null,
      _selectionMode: null,
      _featureItemsSelectionToolbar: null,
      _featureItemsSelectQuery: null,
      _featureMarkerSymbol: null,
      _featureMarkerRenderer: null,
      _featureMarkerSymbol1: null,
      _featureMarkerSymbol2: null,
      _featureIndicatorValue: null,
      _featureTypeValue: null,
      _dynamicMapValue: null,
      _dynamicLayerToUse: null,
      _sourceOfAvailableReports: null,
      _sourceOfKnownLayers: null,
      _listOfKnownLayers: null,
      _listOfAvailableReportsForTheCurrentLayer: null,
      _dropDownBox1HandlerRef: null,
      _dropDownBox2HandlerRef: null,
      _savedLayersInfo: null,
      _savedLayerMemoryStore: null,

      /// Had to re-Architect this so that the user is allowed to load associated layers,
      /// then select one of the loaded layers to perform a selection on. There is not currently
      /// the functionality needed within arcgis server to provide the script with access to the
      /// layers within a map service separately in an effective way.

      postCreate: function() {
        this.inherited(arguments);
        console.log('postCreate');
      },

      startup: function() {
        this.inherited(arguments);
        console.log('startup');
      },

      onOpen: function() {
        console.log('onOp0');

        // Async data loading code starts here.
        // Allows the necessary functions to run in the right
        // order, waiting until each necessary preceding function
        // completes.

        function savedLayersReady() {
          console.log("_savedLayersInfo:");
          console.log(this._savedLayersInfo);
          var someData = [
          ];

          var idToAdd = 1;

          arrayUtil.forEach(this._savedLayersInfo, function(savedLayerItem) {
            someData.push({id:idToAdd, layerName:savedLayerItem[0], layerUrl:savedLayerItem[1], isInMap:false, mapLayerId:null,
              layerDefaultAttribute:savedLayerItem[2], layerReports:savedLayerItem[3]});
            idToAdd += 1;
          }, this);

          arrayUtil.forEach(someData, function (someDataItem) {
            console.log(someDataItem);
          }, this);

          var tempDataStore = new Memory({data: someData});

          this._savedLayerMemoryStore = tempDataStore;
          // Create a data store here from the loaded js data.
          // Then, add information to it based on which layer is selected
          // and which layers have been added to/removed from the map.

          console.log('Added items to the dataStore.');
        };

        var savedLayersReady_This = savedLayersReady.bind(this);

        function setSavedLayers() {
          this._savedLayersInfo = json.fromJson(reportingLayersConfig).layersArray;
          setTimeout(function() {
            savedLayersReady_This();
          }, 50);
        };

        var setSavedLayers_This = setSavedLayers.bind(this);

        var populateDropDown0_This = this._populateDropDownFeaturesToBeAddedToTheMap.bind(this);

        function setTheLayersAndPopulateDropDown0() {
          setSavedLayers_This();
          setTimeout(function() {
            populateDropDown0_This();
          }, 50);
        };

        setTheLayersAndPopulateDropDown0();
        // Async data loading code complete.
        
        console.log('onOp1');

        // Probably need to do some work here to make sure that the
        // correct layer gets selected.
        lang.hitch(this, this._initFeatureItemsSelectToolbar);

        // Needs to be moved and to pass in the correct layer for this on
        // change of the first dropdown Box. -- Should already have the feature layer
        // id necessary to make the toolbar look at the right layer.
        this._initFeatureItemsSelectToolbar();
        
        // This.own with on(this.buttton, "action", and lang.hitch(this, this.functionName);
        //this.own(on(this.addFeaturesButton, "click", lang.hitch(this, this._addFeaturesToTheMap)));

        this.own(on(this.addFeaturesButton, "click", lang.hitch(this, this._addSelectedFeaturesToTheMap)));
        
        // Layer detection & content creation for the dropDowns button function registration. //
        // Removed button // this.own(on(this.detectReportableLayers, "click", lang.hitch(this, this._detectReportLinkedLayers)));
        
        // Drawing related buttons function registration. //
        this.own(on(this.startNewSelected, "click", lang.hitch(this, this._newSelectedFeatureItems)));
        this.own(on(this.startAddSelected, "click", lang.hitch(this, this._addSelectedFeatureItems)));
        this.own(on(this.startSubtractSelected, "click", lang.hitch(this, this._subtractSelectedFeatureItems)));
        this.own(on(this.startClearSelected, "click", lang.hitch(this, this._clearSelectedFeatureItems)));

        // Report link button function registration. //
        this.own(on(this.buildReportLink, "click", lang.hitch(this, this._showReportLinkForSelectedFeatureItems)));

        //this.own(on(this.dropDownBox1, "change", lang.hitch(this, this._dropDownBox1Handler)));
        // Moved to where the innerHtml gets set.
        // Test there and then see if you can hitch it here.
        // // -- Actually probably unnecessary with the ability to just query the value with a button.
        //this.own(on(this.reportDropDownBox1, "change", lang.hitch(this, this._dropDownBox1Handler)));
        
        // Add in the code to add the map service here
        // wire it up to a button so that you can add
        // the data programatically.

        // Need to take all the layers in the map and represent them
        // with a checkbox and label.

        // Then, modify the current selection (if any) with the requested
        // button operation, i.e. new selection, add selection, subtract selection,
        // clear selection, show feature ids.

        this._disableDrawingFunctionsAndDropDowns();

        console.log('onOp2.');
        
        console.log('Finished onOpen.');
      },

      // Have to set the layer to use to what was previously called 
      // this._featureFeatureLayer -- as that is what is used in the
      // selection/deselection/feature ID listing calls.

      // Probably change it to interactiveFeatureLayer or something
      // similar, only where you use a better word than interactive
      // or selected.

      // Rename these from *Features to *Features in order
      // to generalize the widget a bit more.
      _newSelectedFeatureItems: function(evt) {
        console.log("Selecting new features...");
        this._selectionMode = FeatureLayer.SELECTION_NEW;
        this._featureItemsSelectionToolbar.activate(Draw.EXTENT);
      },

      _addSelectedFeatureItems: function(evt) {
        console.log("Selecting more features...");
        this._selectionMode = FeatureLayer.SELECTION_ADD;
        this._featureItemsSelectionToolbar.activate(Draw.EXTENT);
      },

      _subtractSelectedFeatureItems: function(evt) {
        console.log("Subtracting some features...");
        this._selectionMode = FeatureLayer.SELECTION_SUBTRACT;
        this._featureItemsSelectionToolbar.activate(Draw.EXTENT);
      },

      _clearSelectedFeatureItems: function(evt) {
        console.log("Clearing selected features...");
        this._featureItemsLayer.clearSelection();
      },
      
      // Should be modified to accept a layer,
      // which would then be set as the
      // this._featureItemsLayer variable, after
      // clearing the previous one's selection,
      // if the variable was not previously null.

      // Actually, that would work better in a separate
      // function. Just let the other ones continue to
      // refer to this._featureItemsLayer.
      // -- Might set the this._featureItemsLayer in
      // the function that enables the buttons for
      // drawing.


      _initFeatureItemsSelectToolbar: function () {
        this._featureItemsSelectionToolbar = new Draw(this.map);
        this._featureItemsSelectQuery = new Query();

        console.log("initting Feature Selection Toolbar.");

        this.own(on(this._featureItemsSelectionToolbar, "DrawEnd", lang.hitch(this, this._selectionComplete)));
      },
      
      _selectionComplete: function (geometry) {
        console.log("Selection complete.");
        this._featureItemsSelectionToolbar.deactivate();
        this._featureItemsSelectQuery.geometry = geometry;
        this._featureItemsLayer.selectFeatures(this._featureItemsSelectQuery,
          this._selectionMode);
        // May be possible to loop through selected features and set their marker symbol's
        // rotation individually.
        // Pseudo follows:
        // -- Feature rotation is probably not super important right now though.
        //// possibly use this._featureFeaturelayer.onSelectionComplete --
        ////featureArray = this._featureFeatureLayer.getSelectedFeatures()
        ////featureArray.foreach(feature => feature.setRotation(feature.attributes.rotationAngle)) -- or similar
      },

      // Generalized from Features to Features.
      _showReportLinkForSelectedFeatureItems: function (event) {
        this._featureWebiLink2ndPart = '';
        var selectedReport = domAttr.get('dropDownBox2', 'value');
        console.log("Selected Report:");
        console.log(selectedReport);

        var selectedLayer = domAttr.get('dropDownBox1', 'value');
        console.log("Selected Layer:");
        console.log(selectedLayer);

        var selectedFeatureLayerQuery = {layerName:selectedLayer};
        var selectedFeatureLayerResult = this._savedLayerMemoryStore.query(selectedFeatureLayerQuery);
        selectedFeatureLayerResultItem = selectedFeatureLayerResult[0];

        var attributeName = null;
        var someData = [];
        var idToAdd = 1;

        arrayUtil.forEach(selectedFeatureLayerResultItem.layerReports, function(layerReportItem) {
          someData.push({id:idToAdd, reportName:layerReportItem[0], reportUrl:layerReportItem[1], reportAlternateAttribute:layerReportItem[2]});
          idToAdd += 1;
        }, this);

        arrayUtil.forEach(someData, function (someDataItem) {
          console.log(someDataItem);
        }, this);

        var tempDataStore = new Memory({data: someData});
        var tempQuery = {reportName:selectedReport};
        var tempQueryResult = null;

        tempQueryResult = tempDataStore.query(tempQuery);

        tempQueryResultItem = tempQueryResult[0];

        if (typeof(tempQueryResultItem.reportAlternateAttribute) !== "undefined" && tempQueryResultItem.reportAlternateAttribute !== null) {
          attributeName = tempQueryResultItem.reportAlternateAttribute;
        } else {
          attributeName = selectedFeatureLayerResultItem.layerDefaultAttribute;
        }

        this._featureWebiLinkBase = tempQueryResultItem.reportUrl;

        var featureIDList = '';

        var selectedFeaturesArray = this._featureItemsLayer.getSelectedFeatures();

        //console.log('Testing with the following url:');
        //console.log(this._featureWebiLinkBase);

        // new step to get the info out of the array.

        // need to find the url for the report that's selected based
        // on the info for the selected feature layer.

        // console.log -- Output the parse results with a loop over the
        // created object/dictionary's attribute+value/key+value pairs.

        // Now  instead of console.log, use this to create a post object
        // that will work when the link is clicked on.

        // Might need the report ID in the url, but
        // need to have the rest of the parameters
        // in the body as form arguments.

        if (selectedFeaturesArray.length >= 1) {
          var featuresCount = 0;
          arrayUtil.forEach(selectedFeaturesArray, function (feature) {
            if (featuresCount >= 1) {
              this._featureWebiLink2ndPart += ',[' +
               feature.attributes[attributeName].toString() + ']';
               featureIDList += ', ' + feature.attributes[attributeName].toString();
            } else {
              this._featureWebiLink2ndPart += '[' + 
              feature.attributes[attributeName].toString() + ']';
              featureIDList += feature.attributes[attributeName].toString();
            }
            featuresCount += 1;
          }, this);

          //console.log(this._featureWebiLink2ndPart);
          //console.log(this._featureWebiLink2ndPart.toString());
          
          // Added target="_blank" to the <a ...> tag - 2017/08/14
          var dynamicInnerHtml = '<br><a href="' +
            this._featureWebiLinkBase + this._featureWebiLink2ndPart + '" target="_blank">Features Report Link</a>' +
            '<br>' + '<b>Selected Feature IDs: ' +
            featureIDList + ' </b><br><br><br>';

          dom.byId('ReportLinkOutput').innerHTML = dynamicInnerHtml;

        } else {
          dom.byId('ReportLinkOutput').innerHTML = "<br><i>No Selected Features</i><br><br><br>";
        }
      },
      
      // Should be called as soon as one of the report linked layers is added
      // to the map. -- as part of the function that adds the layer to the map.
      // Should be called again when one of the report linked layers is
      // removed from the map. -- again, as part of the function that removes
      // the layer from the map.
      _detectReportLinkedLayers: function (event) {
        // Change this to
        // use the memory store
        // instead of this._savedLayersInfo.
        var reportLinkedLayers = [];
        var currentLayerItems = [];
        var validatedOptionLayers = [];

        arrayUtil.forEach(this.map.graphicsLayerIds, function (layerId) {
          var layer = this.map.getLayer(layerId);
          var currentLayerSet = [];
          console.log("Found a layer with layerId: " + layerId);
          console.log(layer);
          if (typeof(layer._url) !== "undefined" && layer._url !== null){
            currentLayerSet.push([layer._url.path, layerId]);
            currentLayerSet.push(layer.name);
            currentLayerItems.push(currentLayerSet);
          } else {
            console.log("No ._url.path detected.");
          }
          
          console.log(layer.name);
          
        }, this);

        if (currentLayerItems.length >= 1) {
        
          arrayUtil.forEach(currentLayerItems, function (layerSet) {
            arrayUtil.forEach(this._savedLayersInfo, function (savedLayerItem) {
              if (savedLayerItem[1].toLowerCase().indexOf(layerSet[0][0].toString().toLowerCase()) >= 0
                && savedLayerItem[0].toLowerCase().indexOf(layerSet[1].toString().toLowerCase()) >= 0) {
                validatedOptionLayers.push([layerSet[0], layerSet[1]]);
              } else {
                console.log(savedLayerItem[1].toString() + " doesn't match " + layerSet[0][0].toString());
                console.log(savedLayerItem[0].toString() + " doesn't match " + layerSet[1].toString());
              }
            }, this);
          }, this);
        }

        if (validatedOptionLayers.length >= 1) {

          // Use domConstruct to remove/add elements to the first options dropdown box.
          domConstruct.empty("dropDownBox1");

          arrayUtil.forEach(validatedOptionLayers, function (validatedOptionItem) {
            // Use domConstruct to remove/add elements to the first options dropdown box.
            var newOption = domConstruct.toDom('<option value="' + validatedOptionItem[1] + '">' + validatedOptionItem[1] + '</option>');
            domConstruct.place(newOption, "dropDownBox1");
            //console.log("Validated Option Layer " + ik + ": " + validatedOptionLayer.toString());
          }, this);

          // Start registering the onChange handler here.

          if (this._dropDownBox1HandlerRef) {
            console.log("Removing _dropDownBox1HandlerRef.");
            this._dropDownBox1HandlerRef.remove();
          }
          else{
            // do nothing;
          }

          // Kind of a weird way of doing things, but it seems to work.
          this.own(this._dropDownBox1HandlerRef = on(this.dropDownBox1, "change", lang.hitch(this, this._dropDownBox1Handler)));
          // Fire the handler once to initialize the second drop-down box.
          this._dropDownButton1Handler();

          this._enableDrawingFunctionsAndDropDowns();
        } else {
          console.log("No layers to add.");
        }

        console.log("Function completed.");
      },

      _detectReportLinkedLayers_Old: function (event) {
        // Current version switched to memory store query functions
        // instead of arrayUtil and this._savedLayersInfo version.
        var reportLinkedLayers = [];
        var currentLayerItems = [];
        var validatedOptionLayers = [];
        //this._savedLayersInfo = json.fromJson(this._reportingLayers).layersArray; // Already done earlier in the widget.

        arrayUtil.forEach(this.map.graphicsLayerIds, function (layerId) {
          var layer = this.map.getLayer(layerId);
          var currentLayerSet = [];
          console.log("Found a layer with layerId: " + layerId);
          console.log(layer);
          if (typeof(layer._url) !== "undefined" && layer._url !== null){
            currentLayerSet.push([layer._url.path, layerId]);
            currentLayerSet.push(layer.name);
            currentLayerItems.push(currentLayerSet);
          } else {
            console.log("No ._url.path detected.");
          }
          
          console.log(layer.name);
          
        }, this);

        if (currentLayerItems.length >= 1) {
        
          arrayUtil.forEach(currentLayerItems, function (layerSet) {
            arrayUtil.forEach(this._savedLayersInfo, function (savedLayerItem) {
              if (savedLayerItem[1].toLowerCase().indexOf(layerSet[0][0].toString().toLowerCase()) >= 0
                && savedLayerItem[0].toLowerCase().indexOf(layerSet[1].toString().toLowerCase()) >= 0) {
                validatedOptionLayers.push([layerSet[0], layerSet[1]]);
              } else {
                console.log(savedLayerItem[1].toString() + " doesn't match " + layerSet[0][0].toString());
                console.log(savedLayerItem[0].toString() + " doesn't match " + layerSet[1].toString());
              }
            }, this);
          }, this);
        }

        if (validatedOptionLayers.length >= 1) {

          // Use domConstruct to remove/add elements to the first options dropdown box.
          domConstruct.empty("dropDownBox1");

          arrayUtil.forEach(validatedOptionLayers, function (validatedOptionItem) {
            // Use domConstruct to remove/add elements to the first options dropdown box.
            var newOption = domConstruct.toDom('<option value="' + validatedOptionItem[1] + '">' + validatedOptionItem[1] + '</option>');
            domConstruct.place(newOption, "dropDownBox1");
            //console.log("Validated Option Layer " + ik + ": " + validatedOptionLayer.toString());
          }, this);

          // Start registering the onChange handler here.

          if (this._dropDownBox1HandlerRef) {
            console.log("Removing _dropDownBox1HandlerRef.");
            this._dropDownBox1HandlerRef.remove();
          }
          else{
            // do nothing;
          }

          // Kind of a weird way of doing things, but it seems to work.
          this.own(this._dropDownBox1HandlerRef = on(this.dropDownBox1, "change", lang.hitch(this, this._dropDownBox1Handler)));
          // Fire the handler once to initialize the second drop-down box.
          this._dropDownButton1Handler();

          this._enableDrawingFunctionsAndDropDowns();
        } else {
          console.log("No layers to add.");
        }

        console.log("Function completed.");
      },

      _detectReportLinkedLayersCloneForDropDownBox2: function (event) {
        var reportLinkedLayers = [];
        var currentLayerItems = [];
        var validatedOptionLayers = [];
        //this._savedLayersInfo = json.fromJson(this._reportingLayers).layersArray; // Already done earlier in the widgit.

        arrayUtil.forEach(this.map.graphicsLayerIds, function (layerId) {
          var layer = this.map.getLayer(layerId);
          var currentLayerSet = [];
          console.log("Found a layer with layerId: " + layerId);
          console.log(layer);
          if (typeof(layer._url) !== "undefined" && layer._url !== null){
            currentLayerSet.push([layer._url.path, layerId]);
            currentLayerSet.push(layer.name);
            currentLayerItems.push(currentLayerSet);
          } else {
            console.log("No ._url.path detected.");
          }
          
          console.log(layer.name);
          
        }, this);

        if (currentLayerItems.length >= 1) {
        
          arrayUtil.forEach(currentLayerItems, function (layerSet) {
            arrayUtil.forEach(this._savedLayersInfo, function (savedLayerItem) {
              if (savedLayerItem[1].toLowerCase().indexOf(layerSet[0][0].toString().toLowerCase()) >= 0
                && savedLayerItem[0].toLowerCase().indexOf(layerSet[1].toString().toLowerCase()) >= 0) {
                validatedOptionLayers.push([layerSet[0], layerSet[1]]);
              } else {
                console.log(savedLayerItem[1].toString() + " doesn't match " + layerSet[0][0].toString());
                console.log(savedLayerItem[0].toString() + " doesn't match " + layerSet[1].toString());
              }
            }, this);
          }, this);
        }
        
        if (validatedOptionLayers.length >= 1) {

          // Use domConstruct to remove/add elements to the first options dropdown box.
          domConstruct.empty("dropDownBox1");

          arrayUtil.forEach(validatedOptionLayers, function (validatedOptionItem) {
            // Use domConstruct to remove/add elements to the first options dropdown box.
            var newOption = domConstruct.toDom('<option value="' + validatedOptionItem[1] + '">' + validatedOptionItem[1] + '</option>');
            domConstruct.place(newOption, "dropDownBox1");
            //console.log("Validated Option Layer " + ik + ": " + validatedOptionLayer.toString());
          }, this);
          
          // Start registering the onChange handler here.
          
          if (this._dropDownBox1HandlerRef) {
            console.log("Removing _dropDownBox1HandlerRef.");
            this._dropDownBox1HandlerRef.remove();
          }
          else{
            // do nothing;
          }

          // Kind of a weird way of doing things, but it seems to work.
          this.own(this._dropDownBox1HandlerRef = on(this.dropDownBox1, "change", lang.hitch(this, this._dropDownBox1Handler)));
          // Fire the handler once to initialize the second drop-down box.
          this._dropDownButton1Handler();

          this._enableDrawingFunctionsAndDropDowns();
        } else {
          console.log("No layers to add.");
        }

        console.log("Function completed.");
      },

      _testDataStoreAsItRelatesToTheMap: function (evt) {

        // Create a query to get the items from the data store.
        var dsQuery = function (object) {
          return object.id > 0;
        };

        var tdsResults = this._savedLayerMemoryStore.query(dsQuery);

        function iterateOverResultsAndLogId(resultItem) {
          arrayUtil.forEach(resultItem, function (resultPart) {
            console.log("resultPart.id: " + resultPart.id.toString());
            console.log("resultPart.layerName: " + resultPart.layerName.toString());
            console.log("resultPart.layerUrl: " + resultPart.layerUrl.toString());
            console.log("resultPart.isInMap: " + resultPart.isInMap.toString());
            if (resultPart.isInMap === true) {
              console.log("resultPart.mapLayerId: " + resultPart.mapLayerId.toString());
            } else {
              console.log("resultPart is not loaded into the map and therefore has no mapLayerId.");
            }
          }, this);
          console.log("Total length: " + resultItem.length.toString());
        }

        setTimeout(function(){ console.log(tdsResults); }, 1000);
        setTimeout(function(){ iterateOverResultsAndLogId(tdsResults); }, 1000);
        //setTimeout(function(){ exContext._detectReportLinkedLayers(); }, 2500);

        console.log("Completed querying items.");
        //console.log(dsResults);

      },

      _dropDownBox1Handler: function (evt) {
        // Populate the 2nd dropdown box here.
        // Have to figure out how to get the options value text from dropDownBox1 first though.
        // Use domConstruct.empty first, then
        // domConstruct.toDom and domConstruct.place
        console.log("Selection Changed!");
        this._dropDownButton1Handler();

        // Enable the drawing tools.
        // Disable the create report link until there's something done with the drawing tools.

        // Set selection value to a reference to the selected layer so that people
        // can use the drawing tools for that layer. -- Also unselect all of the
        // features for each layer given in this drop-down so that you don't end
        // up with a situation where the user is seeing selected features that
        // they can't unselect with the drawing tools, or where they think that
        // they will be getting a feature from the current layer in the report
        // from a particular location, where the selected item is actually
        // a feature from a different layer.
      },

      _dropDownButton1Handler: function (evt) {
        var sValue1 = domAttr.get('dropDownBox1', 'value');

        function getReportsFromResult(sentResult1) {
          var reportsForSelectedLayer = sentResult1.layerReports;
          
          domConstruct.empty("dropDownBox2");
          arrayUtil.forEach(reportsForSelectedLayer, function (reportItem) {
            // Use domConstruct to remove/add elements to the first options dropdown box.
            // Make this use the same key for both the value and valueText, with the previously
            // used reportItem[1] being gathered from the datastore with information from
            // the currently selected option when the create report link button is pressed.
            var newOption = domConstruct.toDom('<option value="' + reportItem[0] + '">' + reportItem[0] + '</option>');
            domConstruct.place(newOption, "dropDownBox2");
          }, this);

          if (typeof(this._featureItemsLayer) !== "undefined" && this._featureItemsLayer !== null) {
            this._clearSelectedFeatureItems();
          }

          this._featureItemsLayer = this.map.getLayer(sentResult1.mapLayerId);
        };

        var getReportsFromResult_This = getReportsFromResult.bind(this);

        function selectReportsWithQuery(selectionValue1) {
          var sVQuery1 = {layerName:selectionValue1};
          var sVQuery1Result = this._savedLayerMemoryStore.query(sVQuery1);
          setTimeout(function(){ getReportsFromResult_This(sVQuery1Result[0]); }, 50);
        };

        var selectReportsWithQuery_This = selectReportsWithQuery.bind(this);

        selectReportsWithQuery_This(sValue1);
      },

      // Called at the start of the widget,
      // will also need to be called if there
      // are no layers in the memory store
      // that have isInMap set to true.
      // That should be checked whenever a layer
      // is removed from the map.
      // -- Layer removal functionality
      // is not yet added, however, so not a big concern yet.
      _disableDrawingFunctionsAndDropDowns: function(evt)  {
        var sNSButton = registry.byId("startNewSelected");
        sNSButton.domNode.style.display = "none";
        var sASButton = registry.byId("startAddSelected");
        sASButton.domNode.style.display = "none";
        var sSSButton = registry.byId("startSubtractSelected");
        sSSButton.domNode.style.display = "none";
        var sCSButton = registry.byId("startClearSelected");
        sCSButton.domNode.style.display = "none";
        var dDB2Div = registry.byId("dropDownBox2Div");
        console.log(dDB2Div);
        dDB2Div.domNode.style.display = "none";
        //var sddButton = dom.byId("dropDownBox2Div");
        //sddButton.domNode.style.display = "none";
        var bRLButton = registry.byId("buildReportLink");
        bRLButton.domNode.style.display = "none";
        //registry.byId("startNewSelected").set("style.display", "none");
        //this.startNewSelected.style.display = 'none';
        //dropDownBox1
        //startNewSelected
        //startAddSelected
        //startSubtractSelected
        //startClearSelected
        //dropDownBox2
      },

      // Called when adding layers to the map.
      _enableDrawingFunctionsAndDropDowns: function(evt)  {
        var sNSButton = registry.byId("startNewSelected");
        sNSButton.domNode.style.display = "block";
        var sASButton = registry.byId("startAddSelected");
        sASButton.domNode.style.display = "block";
        var sSSButton = registry.byId("startSubtractSelected");
        sSSButton.domNode.style.display = "block";
        var sCSButton = registry.byId("startClearSelected");
        sCSButton.domNode.style.display = "block";
        var dDB2Div = registry.byId("dropDownBox2Div");
        dDB2Div.domNode.style.display = "block";
        var bRLButton = registry.byId("buildReportLink");
        bRLButton.domNode.style.display = "block";
        //registry.byId("startNewSelected").set("style.display", "block");
        //this.startNewSelected.style.display = 'block';
        //dropDownBox1
        //startNewSelected
        //startAddSelected
        //startSubtractSelected
        //startClearSelected
        //dropDownBox2
      },

      _enableReportLinkButton: function(evt) {
        console.log("_enableReportLinkButton function executed");
        //buildReportLink
      },

      _populateDropDownFeaturesToBeAddedToTheMap: function(evt) {
        var reportLinkedLayers = [];
        var dropDown0Query = {};

        dropDown0Query = function (layerItem) {
          return layerItem.id >= 0;
        };

        dD0QResults = this._savedLayerMemoryStore.query(dropDown0Query);

        // Use domConstruct to remove/add elements to the first options dropdown box.
        domConstruct.empty("dropDownBox0");

        console.log("Adding features to dropDownBox0.");
        arrayUtil.forEach(dD0QResults, function (queryResultItem) {
          console.log(queryResultItem);
          var newOption = domConstruct.toDom('<option value="' + queryResultItem.layerName + '">' + queryResultItem.layerName + '</option>');
          domConstruct.place(newOption, "dropDownBox0");
          
        }, this);

        console.log("Function completed.");
      },

      // Should be able to get the necessary information for this from the user and the js data.
      _addSelectedFeaturesToTheMap: function(evt) {
        //this.addFeaturesButton.disabled = "true";

        //this._mapFeature = this.map.getLayer(this.map.layerIds[0]);

        // Check to make sure that the layer isn't already in the map by looping through the layers
        // and don't add it if it already exists.

        // Have to get the feature layers from the page to do that. Currently don't have any
        // feature layers being added, so this will be an issue.

        // Go ahead and build the part that adds features first, then add the part that
        // checks to make sure that you're not adding it twice.

        this._selectedFeaturesMarkerSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_DIAMOND, 12,          
          new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            new Color([41,73,231]),
          2),
          new Color([231,223,24,0.8])
        );
        // Can apply a renderer after the layer is added to the map...
        // Use the featureMarkerSymbol for now, apply renderer later.

        // Get the info from the js data and the add to the map dropdown.
        // Skipped for now.
        // //var featureItemsContent = "<b>Feature ID</b>: ${BRIDGE_ID}";
        // //var featuresItemInfoTemplate = new InfoTemplate("${FIELD_NAME}", featureItemsContent);
        ///////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////
        // Get this info from the loaded js data, and push the info onto a selection stack.

        var reportsForSelectedLayer = [];
        
        var selectedValue = domAttr.get('dropDownBox0', 'value');

        //console.log("Attempting to load the feature layer located at url: " + selectedValue);

        //var featureItemUrl = domAttr.get('dropDownBox0', 'value');

        // Use the datastore to make sure that the layer has not yet been added to the map
        // otherwise, go to else.
        var dsQuery = {layerName:selectedValue};

        var qResult = this._savedLayerMemoryStore.query(dsQuery);

        var qResultItem = null;

        if (qResult.length > 0) {
          qResultItem = qResult[0];
        }

        console.log(this._savedLayerMemoryStore.query(dsQuery));

        if (qResult.length > 0) {
          console.log("qResult Length greater than 0.");
        } else {
          console.log("qResult Length equals 0.");
        }

        if (qResult[0].isInMap !== true) {
          // Have to rewrite this so that it gets the URL from the query object.
          this._featureLayerToAdd = new FeatureLayer(qResult[0].layerUrl,
          {
            mode: FeatureLayer.MODE_ONDEMAND,//.MODE_SNAPSHOT,
            //infoTemplate: featuresItemInfoTemplate,
            outFields: ["*"]
          });

          this._featureLayerToAdd.setSelectionSymbol(this._selectedFeaturesMarkerSymbol);

          // SUCCESS! -- Now just need to pull the info from the memory store from the "layer to select features from:"
          // dropdown box to the select features buttons and reset the data onchange of the item in that dropdown box.
          // =)

          // function.prototype.bind -- Return the function with it bound to a different context.
          // pass the function and the context into bind to return the function.
          // ^^ Done. Expand to the other areas where we need to access the datastore.

          // Use this instead of passing the context as trampoline data. -- Should be cleaner and more
          // accurately show what you're trying to do with the async function.

          function updateTheMemoryStoreWithNewMapLayerData(memoryStoreResult, currentMapLayerData){
            memoryStoreResult.isInMap = true;
            memoryStoreResult.mapLayerId = currentMapLayerData.id;
            this._savedLayerMemoryStore.put(memoryStoreResult, {overwrite: true});
            // Might have execution context problems... because javascript.
            // bind or pass in the proper execution context if so.
            console.log("Layer " + memoryStoreResult.layerName + " with layerId " + memoryStoreResult.mapLayerId + " added.");
            ggQuery = {layerName:memoryStoreResult.layerName};
            ggQueryResult = this._savedLayerMemoryStore.query(ggQuery);
            console.log("ggQueryResult:");
            console.log(ggQueryResult);
          }

          var updateTheMemoryStoreWithNewMapLayerData_this = updateTheMemoryStoreWithNewMapLayerData.bind(this);

          function asyncAddAndUpdate(resultItem) {
            // Do the thing that you want to do first
            // then the setTimeout callback function will fire
            // because the queue is empty... it will
            // *wait* until the queue is empty however,
            // which means that until the previous function
            // is done processing, we don't have to worry
            // about the function in setTimeout starting.
            var newLayerData = null;
            newLayerData = this.map.addLayer(this._featureLayerToAdd); 

            setTimeout(function(){ updateTheMemoryStoreWithNewMapLayerData_this(resultItem, newLayerData); }, 50);
          }

          var asyncAddAndUpdate_this = asyncAddAndUpdate.bind(this);

          asyncAddAndUpdate_this(qResultItem);


        } else {
          console.log("This layer is already in the map.");
          console.log("It will not be added again as that would be confusing with this widget.");
        }

        // Could possibly overcome this by passing the layer into the function
        // and having it not deselect all at that point, and also having
        // it keep the previously selected layer in the drop down as the
        // newly selected layer in the drop-down, so long as the layer
        // hasn't been removed by another function. -- So, will still
        // need that kind of detection here.
        this._timeOutDetectLayers(this);
        //setTimeout(this._detectReportLinkedLayers(), 5500);
        
      },

      // Also fix use of setTimeout so that it's being called correctly.
      // Possibly removing this function entirely and putting
      // the contents where it would make more sense (where it's currently
      // being called instead.)
      // replace exContext with function binding to the current 'this'.
      _timeOutDetectLayers: function(exContext) {
        setTimeout(function(){ exContext._detectReportLinkedLayers(); }, 1000);
      },

      _checkMapForFeatureLayer: function(featuresToCheckFor) {
        // arrayUtil.forEach(layer in map)
        // 
      },

      onClose: function() {
        console.log('onClose');
      }
  });
});