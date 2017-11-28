/*
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

import React from 'react';
import sdk from '../../../index';
import PropTypes from 'prop-types';
import { _t } from '../../../languageHandler';

const SendWiringInformationButton = function(props) {
    const ActionButton = sdk.getComponent('elements.ActionButton');
    return (
        <ActionButton action="view_send_wiring_information"
            label={ "Send Wiring Information" }
            iconPath="img/icons-bankdetails.svg"
            size={props.size}
            tooltip={props.tooltip}
        />
    );
};

SendWiringInformationButton.propTypes = {
    size: PropTypes.string,
    tooltip: PropTypes.bool,
};

export default SendWiringInformationButton;
