const chroma = require('chroma-js');
const _ = require('lodash');

/**
 * Generates contrasting counterparts of the given palette.
 * The provided palette must be in the same format with
 * default Tailwind color palettes.
 *
 * @param palette
 * @private
 */
const generateContrasts = (palette) => {
    const lightColor = '#FFFFFF';
    let darkColor = '#FFFFFF';

    // Iterate through the palette to find the darkest color
    _.forEach(palette, (color) => {
        darkColor =
            chroma.contrast(color, '#FFFFFF') >
            chroma.contrast(darkColor, '#FFFFFF')
                ? color
                : darkColor;
    });

    // Generate the contrasting colors
    return _.fromPairs(
        _.map(palette, (color, hue) => [
            hue,
            chroma.contrast(color, darkColor) >
            chroma.contrast(color, lightColor)
                ? darkColor
                : lightColor,
        ])
    );
};

module.exports = generateContrasts;
