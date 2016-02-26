Ext.define("FieldAnalysis", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "FieldAnalysis"
    },

    models: ['HierarchicalRequirement','Task','PortfolioItem','Defect','TestCase','TestCaseResult','DefectSuite','TestSet','Iteration','Release','Project'],

    launch: function() {
        this._fetchModels(this.models);
    },

    _fetchModels: function(models){
         Rally.data.ModelFactory.getModels({
            types: models,
            success: function(models){
                this.logger.log('_fetchModels', models);
                this._buildFieldStore(models);
            },
            failure: function(){
                this.logger.log('_fetchModels failure');
            },
            scope: this
        });
    },
    _buildFieldStore: function(models){
        this.logger.log('_buildFieldStore');

        var promises = [];

        _.each(models, function(model) {
            var fieldChecker = Ext.create('Rally.technicalservices.ModelFieldChecker',{
                model: model
            });

            promises.push(fieldChecker.fetchData());
        });

        Deft.Promise.all(promises).then({
            success: function(results){
                var data = _.flatten(results);
                this._displayGrid(data);
            },
            failure: function(msg){},
            scope: this
        });

    },

    _loadWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        var default_config = {
            model: 'Defect',
            fetch: ['ObjectID']
        };
        this.logger.log("Starting load:",config.model);
        Ext.create('Rally.data.wsapi.Store', Ext.Object.merge(default_config,config)).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    _displayGrid: function(data){
        this.logger.log('data', data);
        var store = Ext.create('Rally.data.custom.Store',{
            data: data,
            fields: ['model','fieldName','fieldDisplayName','fieldType','totalCount', 'uniqueValues'],
            groupField: 'model',
            groupDir: 'ASC',
            getGroupString: function(record) {
                return (record.get('model'));
            }
        });

        //data.push({model: model.name, field: c, fieldName: c.name, fieldDisplayName: c.attributeDefinition.displayName, fieldType: c.attributeDefinition.AttributeType,  totalCount: vals.length, uniqueValues: _.uniq(vals)});
        var fieldNames =  ['model','fieldName','fieldDisplayName','fieldType','totalCount', 'uniqueValues'];

        this.down('#display_box').add({
            xtype: 'rallygrid',
            store: store,
            columnCfgs: this.getColumnCfgs(),
            features: [{
                ftype: 'groupingsummary',
                groupHeaderTpl: '{name} ({rows.length})'
            }]
        });
    },
    getColumnCfgs: function(){
        return [{
            text: 'Field Display Name ',
            dataIndex: 'fieldDisplayName',
            flex: 1,
        },{
            text: 'Name',
            dataIndex: 'fieldName',
            flex: 1,
        },{
            text: 'Type',
            dataIndex: 'fieldType'

        },{
            text: '# occurances',
            dataIndex: 'totalCount'
        },{
            text: 'Values',
            dataIndex: 'uniqueValues',
            flex: 1,
            renderer: function(v,m,r){
                if (v.length > 0){
                    return _.uniq(v).join('</br>');
                }
                if (r.get('totalCount') > 0){
                    return '<em>not constrained</em>';
                }
                return '';


            }
        }];
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        // Ext.apply(this, settings);
        this.launch();
    }
});
