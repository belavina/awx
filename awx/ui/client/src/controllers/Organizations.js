/*************************************************
 * Copyright (c) 2015 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

/**
 * @ngdoc function
 * @name controllers.function:Organizations
 * @description This controller's for the Organizations page
*/


export function OrganizationsList($stateParams, $scope, $rootScope, $location,
    $log, Rest, Alert, Prompt, GenerateList, OrganizationList, SearchInit,
    PaginateInit, ClearScope, ProcessErrors, GetBasePath, SelectionInit, Wait,
    Stream, $state) {

    ClearScope();

    var list = OrganizationList,
        generate = GenerateList,
        paths = $location.path().replace(/^\//, '').split('/'),
        mode = (paths[0] === 'organizations') ? 'edit' : 'select',
        defaultUrl = GetBasePath('organizations'),
        url;

    generate.inject(OrganizationList, { mode: mode, scope: $scope });
    $rootScope.flashMessage = null;

    if (mode === 'select') {
        url = GetBasePath('projects') + $stateParams.project_id + '/organizations/';
        SelectionInit({ scope: $scope, list: list, url: url, returnToCaller: 1 });
    }

    if ($scope.removePostRefresh) {
        $scope.removePostRefresh();
    }
    $scope.removePostRefresh = $scope.$on('PostRefresh', function () {
        // Cleanup after a delete
        Wait('stop');
        $('#prompt-modal').modal('hide');
    });

    // Initialize search and pagination, then load data
    SearchInit({
        scope: $scope,
        set: list.name,
        list: list,
        url: defaultUrl
    });
    PaginateInit({
        scope: $scope,
        list: list,
        url: defaultUrl
    });
    $scope.search(list.iterator);

    $scope.showActivity = function () {
        Stream({ scope: $scope });
    };

    $scope.addOrganization = function () {
        $state.transitionTo('organizations.add');
    };

    $scope.editOrganization = function (id) {
        $state.transitionTo('organizations.edit', {organization_id: id});
    };

    $scope.deleteOrganization = function (id, name) {

        var action = function () {
            $('#prompt-modal').modal('hide');
            Wait('start');
            var url = defaultUrl + id + '/';
            Rest.setUrl(url);
            Rest.destroy()
                .success(function () {
                    $scope.search(list.iterator);
                })
                .error(function (data, status) {
                    ProcessErrors($scope, data, status, null, { hdr: 'Error!',
                        msg: 'Call to ' + url + ' failed. DELETE returned status: ' + status });
                });
        };

        Prompt({
            hdr: 'Delete',
            body: '<div class="Prompt-bodyQuery">Are you sure you want to delete the organization below?</div><div class="Prompt-bodyTarget">' + name + '</div>',
            action: action,
            actionText: 'DELETE'
        });
    };
}

OrganizationsList.$inject = ['$stateParams', '$scope', '$rootScope',
    '$location', '$log', 'Rest', 'Alert', 'Prompt', 'generateList',
    'OrganizationList', 'SearchInit', 'PaginateInit', 'ClearScope',
    'ProcessErrors', 'GetBasePath', 'SelectionInit', 'Wait',
    'Stream', '$state'
];


export function OrganizationsAdd($scope, $rootScope, $compile, $location, $log,
    $stateParams, OrganizationForm, GenerateForm, Rest, Alert, ProcessErrors,
    ClearScope, GetBasePath, ReturnToCaller, Wait, $state) {

    ClearScope();

    // Inject dynamic view
    var generator = GenerateForm,
        form = OrganizationForm,
        base = $location.path().replace(/^\//, '').split('/')[0];

    generator.inject(form, { mode: 'add', related: false, scope: $scope});
    generator.reset();

    // Save
    $scope.formSave = function () {
        generator.clearApiErrors();
        Wait('start');
        var url = GetBasePath(base);
        url += (base !== 'organizations') ? $stateParams.project_id + '/organizations/' : '';
        Rest.setUrl(url);
        Rest.post({ name: $scope.name, description: $scope.description })
            .success(function (data) {
                Wait('stop');
                if (base === 'organizations') {
                    $rootScope.flashMessage = "New organization successfully created!";
                    $location.path('/organizations/' + data.id);
                } else {
                    ReturnToCaller(1);
                }
            })
            .error(function (data, status) {
                ProcessErrors($scope, data, status, form, { hdr: 'Error!',
                    msg: 'Failed to add new organization. Post returned status: ' + status });
            });
    };

    $scope.formCancel = function () {
        $state.transitionTo('organizations');
    };
}

OrganizationsAdd.$inject = ['$scope', '$rootScope', '$compile', '$location',
    '$log', '$stateParams', 'OrganizationForm', 'GenerateForm', 'Rest', 'Alert',
    'ProcessErrors', 'ClearScope', 'GetBasePath', 'ReturnToCaller', 'Wait',
    '$state'
];


export function OrganizationsEdit($scope, $rootScope, $compile, $location, $log,
    $stateParams, OrganizationForm, GenerateForm, Rest, Alert, ProcessErrors,
    RelatedSearchInit, RelatedPaginateInit, Prompt, ClearScope, GetBasePath,
    Wait, Stream, $state) {

    ClearScope();

    // Inject dynamic view
    var form = OrganizationForm,
        generator = GenerateForm,
        defaultUrl = GetBasePath('organizations'),
        base = $location.path().replace(/^\//, '').split('/')[0],
        master = {},
        id = $stateParams.organization_id,
        relatedSets = {};

    $scope.organization_id = id;

    generator.inject(form, { mode: 'edit', related: true, scope: $scope});
    generator.reset();

    // After the Organization is loaded, retrieve each related set
    if ($scope.organizationLoadedRemove) {
        $scope.organizationLoadedRemove();
    }
    $scope.organizationLoadedRemove = $scope.$on('organizationLoaded', function () {
        for (var set in relatedSets) {
            $scope.search(relatedSets[set].iterator);
        }
        Wait('stop');
    });

    // Retrieve detail record and prepopulate the form
    Wait('start');
    Rest.setUrl(defaultUrl + id + '/');
    Rest.get()
        .success(function (data) {
            var fld, related, set;
            $scope.organization_name = data.name;
            for (fld in form.fields) {
                if (data[fld]) {
                    $scope[fld] = data[fld];
                    master[fld] = data[fld];
                }
            }
            related = data.related;
            for (set in form.related) {
                if (related[set]) {
                    relatedSets[set] = {
                        url: related[set],
                        iterator: form.related[set].iterator
                    };
                }
            }
            // Initialize related search functions. Doing it here to make sure relatedSets object is populated.
            RelatedSearchInit({ scope: $scope, form: form, relatedSets: relatedSets });
            RelatedPaginateInit({ scope: $scope, relatedSets: relatedSets });
            $scope.$emit('organizationLoaded');
        })
        .error(function (data, status) {
            ProcessErrors($scope, data, status, form, { hdr: 'Error!',
                msg: 'Failed to retrieve organization: ' + $stateParams.id + '. GET status: ' + status });
        });


    // Save changes to the parent
    $scope.formSave = function () {
        var fld, params = {};
        generator.clearApiErrors();
        Wait('start');
        for (fld in form.fields) {
            params[fld] = $scope[fld];
        }
        Rest.setUrl(defaultUrl + id + '/');
        Rest.put(params)
            .success(function () {
                Wait('stop');
                $scope.organization_name = $scope.name;
                master = params;
                $rootScope.flashMessage = "Your changes were successfully saved!";
            })
            .error(function (data, status) {
                ProcessErrors($scope, data, status, OrganizationForm, { hdr: 'Error!',
                    msg: 'Failed to update organization: ' + id + '. PUT status: ' + status });
            });
    };

    $scope.showActivity = function () {
        Stream({
            scope: $scope
        });
    };

    $scope.formCancel = function () {
        $state.transitionTo('organizations');
    };

    // Related set: Add button
    $scope.add = function (set) {
        $rootScope.flashMessage = null;
        $location.path('/' + base + '/' + $stateParams.organization_id + '/' + set);
    };

    // Related set: Edit button
    $scope.edit = function (set, id) {
        $rootScope.flashMessage = null;
        $location.path('/' + set + '/' + id);
    };

    // Related set: Delete button
    $scope['delete'] = function (set, itm_id, name, title) {
        $rootScope.flashMessage = null;

        var action = function () {
            Wait('start');
            var url = defaultUrl + $stateParams.organization_id + '/' + set + '/';
            Rest.setUrl(url);
            Rest.post({ id: itm_id, disassociate: 1 })
                .success(function () {
                    $('#prompt-modal').modal('hide');
                    $scope.search(form.related[set].iterator);
                })
                .error(function (data, status) {
                    $('#prompt-modal').modal('hide');
                    ProcessErrors($scope, data, status, null, { hdr: 'Error!',
                        msg: 'Call to ' + url + ' failed. POST returned status: ' + status });
                });
        };

        Prompt({
            hdr: 'Delete',
            body: '<div class="Prompt-bodyQuery">Are you sure you want to remove ' + name + ' from ' + $scope.name + ' ' + title + '?</div>',
            action: action,
            actionText: 'DELETE'
        });

    };
}

OrganizationsEdit.$inject = ['$scope', '$rootScope', '$compile', '$location',
    '$log', '$stateParams', 'OrganizationForm', 'GenerateForm', 'Rest', 'Alert',
    'ProcessErrors', 'RelatedSearchInit', 'RelatedPaginateInit', 'Prompt',
    'ClearScope', 'GetBasePath', 'Wait', 'Stream', '$state'
];
