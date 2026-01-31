export function rgbaBytesToPngDataUrl(rgbaBytes, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(rgbaBytes);
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
}
