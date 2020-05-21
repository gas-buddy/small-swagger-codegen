export default function setupHandlebars(handlebars) {
  // Setup handlebars.
  handlebars.registerHelper('maybeComment', function maybeComment(arg, options) {
    if (!arg) {
      return arg;
    }
    const data = options.data ? undefined : {
      data: handlebars.createFrame(options.data),
    };
    const string = options.fn ? options.fn(this, data) : '';
    if (!string || string.trim() === '') {
      return undefined;
    }
    const trimmed = string.trim().replace(/\n/g, ' ');
    const numSpaces = string.search(/\S/);
    return `${' '.repeat(numSpaces)}/// ${trimmed}\n`;
  });

  handlebars.registerHelper('oneline', function oneline(options) {
    return options.fn(this).trim().replace(/\n/g, ' ').trim();
  });

  handlebars.registerHelper('isNotBodyOrPartParam', function isNotBodyOrPartParam(arg, options) {
    if (!arg) {
      return arg;
    }
    if (arg.inCap === 'Body' || arg.inCap === 'Part') {
      return options.inverse(this);
    }
    return options.fn(this);
  });

  handlebars.registerHelper('jsIdentifier', ident => new handlebars.SafeString(ident.replace(/[.]/g, '_')));

  handlebars.registerHelper('concat', (delim, ...args) => args.slice(0, args.length - 1).join(delim));

  handlebars.registerHelper('kotlinString', str => str.replace(/\$/g, '\\$'));
}
