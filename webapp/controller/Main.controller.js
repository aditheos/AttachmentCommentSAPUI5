sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"intelira/tech/AttachmentCommentDemo/model/formatter",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/syncStyleClass",
	"sap/m/library",
	"sap/m/UploadCollectionParameter"
], function (BaseController, JSONModel, Formatter, MessageToast, Fragment, Filter, FilterOperator, syncStyleClass, MobileLibrary, UploadCollectionParameter) {
	"use strict";

	return BaseController.extend("intelira.tech.AttachmentCommentDemo.controller.Main", {

		formatter: Formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the main controller is instantiated.
		 * @public
		 */
		onInit : function () {
			var oViewModel;

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("mainViewTitle")),
				shareOnJamTitle: this.getResourceBundle().getText("mainTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailMainSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailMainMessage", [location.href]),
				tableBusyDelay : 0
			});
			this.setModel(oViewModel, "mainView");

			// Model used to manipulate Attachment states
			var ListMode = MobileLibrary.ListMode,
				ListSeparators = MobileLibrary.ListSeparators;
			var oAttachModel = new JSONModel({
				"maximumFilenameLength": 55,
				"maximumFileSize": 1000,
				"mode": ListMode.SingleSelectMaster,
				"uploadEnabled": true,
				"uploadButtonVisible": true,
				"enableEdit": false,
				"enableDelete": true,
				"visibleEdit": false,
				"visibleDelete": true,
				"listSeparatorItems": [
					ListSeparators.All,
					ListSeparators.None
				],
				"showSeparators": ListSeparators.All,
				"listModeItems": [
					{
						"key": ListMode.SingleSelectMaster,
						"text": "Single"
					}, {
						"key": ListMode.MultiSelect,
						"text": "Multi"
					}
				]
			});
			this.setModel(oAttachModel, "attachmentSettings");
			
			this.getView().setModel(new JSONModel({
				"items": ["jpg", "txt", "ppt", "doc", "docx","xls", "xlsx", "pdf", "png", "msg" ],
				"selected": ["jpg", "txt", "ppt", "doc", "docx", "xls", "xlsx", "pdf", "png", "msg" ]
			}), "fileTypes");
			
			this.getView().setModel(new JSONModel({
				"ActionItems": [
					{
						"Text": "Delete",
						"Icon": "sap-icon://delete",
						"Key": "delete"
					}
				]
			}), "commentActionSet");
			
			this.getView().setModel(new JSONModel({
				"InstanceID":"0019810528",
				"TypeID":"ZATCH",
				"CategoryID":"BO"
			}), "gosObject");
			
			// Place Holder for New Attachments
			this.aNewAttachments = [];
			
			// Sets the text to the label
			this.byId("attachmentBlock").addEventDelegate({
				onBeforeRendering: function() {
					this.byId("attachmentTitle").setText(this._getAttachmentTitleText());
				}.bind(this)
			});
			
			this.getView().attachAfterRendering(function () {
					// Restore original busy indicator delay for the object view
					this._setUploadUrl();
					this._refreshAttachments();
					this._refreshComments();
				}.bind(this)
			);	
			// Add the main page to the flp routing history
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("mainViewTitle"),
				icon: "sap-icon://table-view",
				intent: "#AttachmnetandCommentDemoApp-display"
			}, true);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		onAttachmentSettings: function (oEvent) {
			var oView = this.getView();

			if (!this._attachmentSettingsDialog) {
				this._attachmentSettingsDialog = Fragment.load({
					id: oView.getId(),
					name: "intelira.tech.AttachmentCommentDemo.view.fragment.AttachmentSettings",
					controller: this
				}).then(function (oAttachmentSettingsDialog) {
					oView.addDependent(oAttachmentSettingsDialog);
					return oAttachmentSettingsDialog;
				});
			}

			this._attachmentSettingsDialog.then(function (oAttachmentSettingsDialog) {
				syncStyleClass("sapUiSizeCompact", oView, oAttachmentSettingsDialog);
				oAttachmentSettingsDialog.setContentWidth("42rem");
				oAttachmentSettingsDialog.open();
			});
		},

		onAttachmentDialogCloseButton: function () {
			this._attachmentSettingsDialog.then(function (oAttachmentSettingsDialog) {
				oAttachmentSettingsDialog.close();
			});
		},
		
		onGOSSettings: function (oEvent) {
			var oView = this.getView();

			if (!this._gosSettingsDialog) {
				this._gosSettingsDialog = Fragment.load({
					id: oView.getId(),
					name: "intelira.tech.AttachmentCommentDemo.view.fragment.GOSSettings",
					controller: this
				}).then(function (oGOSSettingsDialog) {
					oView.addDependent(oGOSSettingsDialog);
					return oGOSSettingsDialog;
				});
			}

			this._gosSettingsDialog.then(function (oGOSSettingsDialog) {
				syncStyleClass("sapUiSizeCompact", oView, oGOSSettingsDialog);
				oGOSSettingsDialog.setContentWidth("42rem");
				oGOSSettingsDialog.open();
			});
		},

		onGOSDialogCloseButton: function () {
			this._gosSettingsDialog.then(function (oGOSSettingsDialog) {
				oGOSSettingsDialog.close();
			});
			this._setUploadUrl();
		},
		
		onAttachmentChange: function(oEvent) {
			var oUploadCollection = oEvent.getSource();
			
			// Header Token
			this.getView().getModel().refreshSecurityToken();
			
			var oHeaders = this.getView().getModel().oHeaders;
			var sToken = oHeaders['x-csrf-token'];
			var oCustomerHeaderToken = new UploadCollectionParameter({
				name: "x-csrf-token",
				value: sToken
			});
			oUploadCollection.addHeaderParameter(oCustomerHeaderToken);
			
			var oCustomerRequestToken = new UploadCollectionParameter({
				name: "x-requested-with",
				value: "X"
			});
			oUploadCollection.addHeaderParameter(oCustomerRequestToken);
			
			var oCustomerAcceptToken = new UploadCollectionParameter({
				name: "Accept",
				value: "application/json"
			});
			oUploadCollection.addHeaderParameter(oCustomerAcceptToken);
			
		},
		
		onFileDeleted: function(oEvent) {
			var	oItem = oEvent.getParameter("item"),
				sPath = oItem.getBindingContext().getPath(),
				sFileName = oEvent.getParameter('item').getProperty('fileName'),
				oModel = this.byId("attachmentBlock").getModel(),
			    fnSuccess = function () {
			    	this._refreshAttachments();
					MessageToast.show("File '"+ sFileName + "' is Deleted");
				}.bind(this),

			    fnError = function (oError) {
					MessageToast.show("Error ocurred: Check Message Popover at bottom left");
				}.bind(this);
				
			oModel.remove(sPath, {success: fnSuccess, error: fnError});
		},
		
		onFilenameLengthExceed: function() {
			var oSetting = this.getView().getModel("attachmentSettings"),
			    sMaxLength = oSetting.getProperty("maximumFilenameLength");
			MessageToast.show("Allowed length for Filename is " + sMaxLength + " Characters");
		},

		onFileRenamed: function(oEvent) {
			var oItem = oEvent.getParameter("item"),
			    sObject = oItem.getBindingContext().getObject(),
			    sPath = oItem.getBindingContext().getPath(),
			    sFileName = oEvent.getParameter("fileName"),
			    fnSuccess = function () {
					MessageToast.show("File Renamed Successfully");
				},

			    fnError = function (oError) {
					MessageToast.show("Error ocurred: Check Message Popover at bottom left");
				},
				sendData = {
					InstanceID    : sObject.InstanceID,
					TypeID        : sObject.TypeID,
					CategoryID    : sObject.CategoryID,
					FileName      : sFileName,
					FileSize      : sObject.FileSize,
					CreatedBy     : sObject.CreatedBy,
					CreatedByName : sObject.CreatedByName,
					CreatedAt     : sObject.CreatedAt,
					MimeType      : sObject.MimeType
					
				},
				oAttachModel = this.getView().getModel();
			    
			oAttachModel.update(sPath, sendData, {success: fnSuccess, error: fnError});
			this._refreshAttachments();
		},
		
		onFileTypeMissmatch: function() {
			var oFileTypes = this.getView().getModel("fileTypes"),
				sAllowed = oFileTypes.getData().selected.toString();

			MessageToast.show("Allowed File Types are " + sAllowed);
		},

		onFileUploadComplete: function(oEvent) {
			var sParameters = oEvent.getParameter("mParameters");
			var oResponseJson = JSON.parse(sParameters.responseRaw);
			this.aNewAttachments.push(oResponseJson.d.Id);
			
			this._refreshAttachments();
			
			// delay the success message for to notice onChange message
			MessageToast.show("File Upload Completed");

		},

		onBeforeFileUploadStarts: function(oEvent) {
			// Header Slug
			var oCustomerHeaderSlug = new UploadCollectionParameter({
				name: "slug",
				value: oEvent.getParameter("fileName")
			});
			oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);
			
			MessageToast.show("File Upload Started");
		},

		onFileUploadTerminated: function() {
			/*
			// get parameter file name
			var sFileName = oEvent.getParameter("fileName");
			// get a header parameter (in case no parameter specified, the callback function getHeaderParameter returns all request headers)
			var oRequestHeaders = oEvent.getParameters().getHeaderParameter();
			*/
		},
		
		onDeleteAttachmentAll:function() {
			var aAttachItems = this.getView().byId("attachmentBlock").getItems(),
			    oAttachModel = this.getView().getModel();
			    
			oAttachModel.setUseBatch(true);
			
			aAttachItems.forEach(function deleteAttach(oItem, sIndex){
				oAttachModel.setDeferredGroups(["delAtt" + sIndex]);
				var sPath = oItem.getBindingContext().getPath();
				oAttachModel.remove(sPath, {groupId: "delAtt" + sIndex });
			}.bind(this));
			
			oAttachModel.submitChanges();
			this._refreshAttachments();
		},
		
		onDeleteAttachmentNew:function() {
			var sGosData = this.getModel("gosObject").getData(),
			    oAttachModel = this.getView().getModel();
			    
			oAttachModel.setUseBatch(true);
			
			this.aNewAttachments.forEach(function deleteAttach(sId, sIndex){
				oAttachModel.setDeferredGroups(["delAtt" + sIndex]);
				var sPath = this.getView().getModel().createKey("AttachmentSet",{
					       		InstanceID: sGosData.InstanceID,
					       		TypeID: sGosData.TypeID,
					       		CategoryID: sGosData.CategoryID,
					       		Id: sId
					       	})  ;
				 sPath = "/" + sPath;
				 oAttachModel.remove(sPath, {groupId: "delAtt" + sIndex });
			}.bind(this));
			
			oAttachModel.submitChanges();
			this._refreshAttachments();
		},
		
		onPostComment: function(oEvent){
			var fnSuccess = function () {
					MessageToast.show("Comment is Posted Successfully");
				},

			    fnError = function (oError) {
					MessageToast.show("Error ocurred: Check Message Popover at bottom left");
				},
				sGosData = this.getModel("gosObject").getData(),
				sComment = oEvent.getParameter("value"),
				sendData = { 
									   InstanceID: sGosData.InstanceID,
									   TypeID: sGosData.TypeID, 
									   CategoryID: sGosData.CategoryID,
									   Id: '',
									   Note: sComment
							},
				oModel = this.getView().getModel();
			    oModel.create("/CommentSet", sendData, {success: fnSuccess, error: fnError});
			    this._refreshComments();
		},
		
		onCommentActionPressed: function(oEvent) {
			var sAction = oEvent.getSource().getKey(),
			    oItem   = oEvent.getParameter("item"),
			    sPath   = oItem.getBindingContext().getPath(),
			    oAttachModel = this.getView().getModel();
			    
			if (sAction === "delete") {
				oAttachModel.remove(sPath);
				MessageToast.show("Comment deleted");
			} 
		},
		
		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */
		_getAttachmentTitleText: function() {
			var aItems = this.byId("attachmentBlock").getItems();
			return "Attachments (" + aItems.length + ")";
		},
		
		_setUploadUrl: function(){
			// Attachment Upload Path
			var oUploadCollection = this.byId("attachmentBlock");
		    var sGosData = this.getModel("gosObject").getData();
			var sPath = this.getView().getModel().sServiceUrl;
			sPath = sPath + "/"+ 
			        this.getView().getModel().createKey("AttachKeySet",{
			       		InstanceID: sGosData.InstanceID,
			       		TypeID: sGosData.TypeID,
			       		CategoryID: sGosData.CategoryID
					 }) + "/AttachmentSet" ;
			oUploadCollection.setUploadUrl(sPath);
		},
		
		_refreshAttachments: function() {
			var sGosData = this.getModel("gosObject").getData();
			var oUploadCollection = this.byId("attachmentBlock");
			var aFilters = [new sap.ui.model.Filter("InstanceID", sap.ui.model.FilterOperator.EQ, sGosData.InstanceID), 
				            new sap.ui.model.Filter("TypeID", sap.ui.model.FilterOperator.EQ, sGosData.TypeID),
				            new sap.ui.model.Filter("CategoryID", sap.ui.model.FilterOperator.EQ, sGosData.CategoryID)
				            ];
			oUploadCollection.getBinding("items").filter(aFilters);
		},
		
		_refreshComments: function() {
			var sGosData = this.getModel("gosObject").getData();
			var oCommentList = this.byId("commentBlock");
			var aFilters = [new sap.ui.model.Filter("InstanceID", sap.ui.model.FilterOperator.EQ, sGosData.InstanceID), 
				            new sap.ui.model.Filter("TypeID", sap.ui.model.FilterOperator.EQ, sGosData.TypeID),
				            new sap.ui.model.Filter("CategoryID", sap.ui.model.FilterOperator.EQ, sGosData.CategoryID)
				            ];
			oCommentList.getBinding("items").filter(aFilters);
		}
	});
});