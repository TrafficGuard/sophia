const chroma = require('chroma-js');
const _ = require('lodash');

/**
 * Generates palettes from the provided configuration.
 * Accepts a single color string or a Tailwind-like
 * color object. If provided Tailwind-like color object,
 * it must have a 500 hue level.
 *
 * @param config
 */
const generatePalette = (config) => {
    // Prepare an empty palette
    const palette = {
        50: null,
        100: null,
        200: null,
        300: null,
        400: null,
        500: null,
        600: null,
        700: null,
        800: null,
        900: null,
    };

    // If a single color is provided,
    // assign it to the 500
    if (_.isString(config)) {
        palette[500] = chroma.valid(config) ? config : null;
    }

    // If a partial palette is provided,
    // assign the values
    if (_.isPlainObject(config)) {
        if (!chroma.valid(config[500])) {
            throw new Error(
                'You must have a 500 hue in your palette configuration! Make sure the main color of your palette is marked as 500.'
            );
        }

        // Remove everything that is not a hue/color entry
        config = _.pick(config, Object.keys(palette));

        // Merge the values
        _.mergeWith(palette, config, (objValue, srcValue) =>
            chroma.valid(srcValue) ? srcValue : null
        );
    }

    // Prepare the colors array
    const colors = Object.values(palette).filter((color) => color);

    // Generate a very dark and a very light versions of the
    // default color to use them as the boundary colors rather
    // than using pure white and pure black. This will stop
    // in between colors' hue values to slipping into the grays.
    colors.unshift(
        chroma
            .scale(['white', palette[500]])
            .domain([0, 1])
            .mode('lrgb')
            .colors(50)[1]
    );
    colors.push(
        chroma
            .scale(['black', palette[500]])
            .domain([0, 1])
            .mode('lrgb')
            .colors(10)[1]
    );

    // Prepare the domains array
    const domain = [
        0,
        ...Object.entries(palette)
            .filter(([key, value]) => value)
            .map(([key]) => parseInt(key) / 1000),
        1,
    ];

    // Generate the color scale
    const scale = chroma.scale(colors).domain(domain).mode('lrgb');

    // Build and return the final palette
    return {
        50: scale(0.05).hex(),
        100: scale(0.1).hex(),
        200: scale(0.2).hex(),
        300: scale(0.3).hex(),
        400: scale(0.4).hex(),
        500: scale(0.5).hex(),
        600: scale(0.6).hex(),
        700: scale(0.7).hex(),
        800: scale(0.8).hex(),
        900: scale(0.9).hex(),
    };
};

module.exports = generatePalette;
