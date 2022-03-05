export function getGroupedFeatureSubPath(fullFeatureFilePath:string): string {
  const featuresFolderIndex = fullFeatureFilePath.lastIndexOf("/features/") + "/features/".length;
  return fullFeatureFilePath.substring(featuresFolderIndex);
}

export function getFeatureSubPath(fullFeatureFilePath:string): string {
  const featuresFolderIndex = fullFeatureFilePath.lastIndexOf("/features/") + 1;
  return fullFeatureFilePath.substring(featuresFolderIndex);
}



