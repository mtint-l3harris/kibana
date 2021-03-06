/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function checkLicense(xpackLicenseInfo) {
  const pluginName = 'Cross-Cluster Replication';

  // If, for some reason, we cannot get the license information
  // from Elasticsearch, assume worst case and disable
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      isAvailable: false,
      showLinks: true,
      enableLinks: false,
      message: i18n.translate(
        'xpack.crossClusterReplication.checkLicense.errorUnavailableMessage',
        {
          defaultMessage:
            'You cannot use {pluginName} because license information is not available at this time.',
          values: { pluginName },
        }
      ),
    };
  }

  const VALID_LICENSE_MODES = ['trial', 'platinum', 'enterprise'];

  const isLicenseModeValid = xpackLicenseInfo.license.isOneOf(VALID_LICENSE_MODES);
  const isLicenseActive = xpackLicenseInfo.license.isActive();
  const licenseType = xpackLicenseInfo.license.getType();

  // License is not valid
  if (!isLicenseModeValid) {
    return {
      isAvailable: false,
      isActive: false,
      message: i18n.translate(
        'xpack.crossClusterReplication.checkLicense.errorUnsupportedMessage',
        {
          defaultMessage:
            'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
          values: { licenseType, pluginName },
        }
      ),
    };
  }

  // License is valid but not active
  if (!isLicenseActive) {
    return {
      isAvailable: true,
      isActive: false,
      message: i18n.translate('xpack.crossClusterReplication.checkLicense.errorExpiredMessage', {
        defaultMessage:
          'You cannot use {pluginName} because your {licenseType} license has expired',
        values: { licenseType, pluginName },
      }),
    };
  }

  // License is valid and active
  return {
    isAvailable: true,
    isActive: true,
  };
}
