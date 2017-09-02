/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import Matrix from 'matrix-js-sdk';

import Promise from 'bluebird';
import url from 'url';

export default class Login {
    constructor(hsUrl, isUrl, fallbackHsUrl, opts) {
        this._hsUrl = hsUrl;
        this._isUrl = isUrl;
        this._fallbackHsUrl = fallbackHsUrl;
        this._currentFlowIndex = 0;
        this._flows = [
            'firebase',
            'matrix-default',
        ];
        this._defaultDeviceDisplayName = opts.defaultDeviceDisplayName;
    }

    getHomeserverUrl() {
        return this._hsUrl;
    }

    getIdentityServerUrl() {
        return this._isUrl;
    }

    setHomeserverUrl(hsUrl) {
        this._hsUrl = hsUrl;
    }

    setIdentityServerUrl(isUrl) {
        this._isUrl = isUrl;
    }

    /**
     * Get a temporary MatrixClient, which can be used for login or register
     * requests.
     */
    _createTemporaryClient() {
        return Matrix.createClient({
            baseUrl: this._hsUrl,
            idBaseUrl: this._isUrl,
        });
    }

    getFlows() {
        var self = this;
        var client = this._createTemporaryClient();
        return client.loginFlows().then(function (result) {
            self._flows = result.flows;
            self._currentFlowIndex = 0;
            // technically the UI should display options for all flows for the
            // user to then choose one, so return all the flows here.
            return self._flows;
        });
    }

    chooseFlow(flowIndex) {
        this._currentFlowIndex = flowIndex;
    }

    getCurrentFlowStep() {
        // technically the flow can have multiple steps, but no one does this
        // for login so we can ignore it.
        var flowStep = this._flows[ this._currentFlowIndex ];
        return flowStep ? flowStep.type : null;
    }

    loginAsGuest() {
        var client = this._createTemporaryClient();
        return client.registerGuest({
            body: {
                initial_device_display_name: this._defaultDeviceDisplayName,
            },
        }).then((creds) => {
            return {
                userId: creds.user_id,
                deviceId: creds.device_id,
                accessToken: creds.access_token,
                homeserverUrl: this._hsUrl,
                identityServerUrl: this._isUrl,
                guest: true,
            };
        }, (error) => {
            throw error;
        });
    }

    loginViaPassword(username, phoneCountry, phoneNumber, pass) {
        const self = this;

        const isEmail = username.indexOf('@') > 0;

        let identifier;
        let legacyParams; // parameters added to support old HSes
        if (phoneCountry && phoneNumber) {
            identifier = {
                type: 'm.id.phone',
                country: phoneCountry,
                number: phoneNumber,
            };
            // No legacy support for phone number login
        } else if (isEmail) {
            identifier = {
                type: 'm.id.thirdparty',
                medium: 'email',
                address: username,
            };
            legacyParams = {
                medium: 'email',
                address: username,
            };
        } else {
            identifier = {
                type: 'm.id.user',
                user: username,
            };
            legacyParams = {
                user: username,
            };
        }

        const loginParams = {
            password: pass,
            identifier: identifier,
            initial_device_display_name: this._defaultDeviceDisplayName,
        };
        Object.assign(loginParams, legacyParams);

        const client = this._createTemporaryClient();
        return client.login('m.login.password', loginParams).then(function (data) {
            return Promise.resolve({
                homeserverUrl: self._hsUrl,
                identityServerUrl: self._isUrl,
                userId: data.user_id,
                deviceId: data.device_id,
                accessToken: data.access_token,
            });
        }, function (error) {
            if (error.httpStatus === 403) {
                if (self._fallbackHsUrl) {
                    var fbClient = Matrix.createClient({
                        baseUrl: self._fallbackHsUrl,
                        idBaseUrl: this._isUrl,
                    });

                    return fbClient.login('m.login.password', loginParams).then(function (data) {
                        return Promise.resolve({
                            homeserverUrl: self._fallbackHsUrl,
                            identityServerUrl: self._isUrl,
                            userId: data.user_id,
                            deviceId: data.device_id,
                            accessToken: data.access_token,
                        });
                    }, function (fallback_error) {
                        // throw the original error
                        throw error;
                    });
                }
            }
            throw error;
        });
    }

    redirectToCas() {
        const client = this._createTemporaryClient();
        const parsedUrl = url.parse(window.location.href, true);

        // XXX: at this point, the fragment will always be #/login, which is no
        // use to anyone. Ideally, we would get the intended fragment from
        // MatrixChat.screenAfterLogin so that you could follow #/room links etc
        // through a CAS login.
        parsedUrl.hash = '';

        parsedUrl.query[ 'homeserver' ] = client.getHomeserverUrl();
        parsedUrl.query[ 'identityServer' ] = client.getIdentityServerUrl();
        const casUrl = client.getCasLoginUrl(url.format(parsedUrl));
        window.location.href = casUrl;
    }
}
