import * as core from '@actions/core';
import * as github from '@actions/github';
import { BUILD_DIR, SHOPIFY_THEME_ROLE } from '../inputs';
import { getCustomizeURL, getPreviewURL } from '../helpers/shopify';
import buildFromEnvironment from './parts/build-from-environment';
import uploadZip from './parts/upload-zip';
import { createPreviewComment, getExistingThemeIDFromComments } from '../helpers/github';
import cleanup from './parts/cleanup';
import deployToExistingTheme from './parts/deploy-to-existing-theme';
import createZipFromBuild from './parts/create-zip-from-build';

export default async () => {
  try {
    let themeID: number;
    let previewURL: string;
    let customizeURL: string;

    themeID = await getExistingThemeIDFromComments();

    if (themeID) {
      previewURL = getPreviewURL(themeID);
      customizeURL = getCustomizeURL(themeID);

      await deployToExistingTheme(themeID);
    } else {
      await buildFromEnvironment();
      const zipFilePath = await createZipFromBuild();
      themeID = await uploadZip(zipFilePath, {
        name: `[PR] ${github.context.eventName}`,
        role: SHOPIFY_THEME_ROLE,
      });
      cleanup([BUILD_DIR, zipFilePath]);

      previewURL = getPreviewURL(themeID);
      customizeURL = getCustomizeURL(themeID);

      await createPreviewComment(previewURL, customizeURL);
    }

    core.setOutput('SHOPIFY_THEME_ID', themeID);
    core.setOutput('SHOPIFY_THEME_PREVIEW_URL', previewURL);
    core.setOutput('SHOPIFY_THEME_CUSTOMIZE_URL', customizeURL);
  } catch (error) {
    core.setFailed(error.message);
  }
};
