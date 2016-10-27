/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import Plugin from './plugin.js';
import CKEditorError from '../utils/ckeditorerror.js';
import log from '../utils/log.js';

/**
 * Manages a list of CKEditor plugins, including loading, resolving dependencies and initialization.
 *
 * @memberOf core
 */
export default class PluginCollection {
	/**
	 * Creates an instance of the PluginCollection class, initializing it with a set of plugins.
	 *
	 * @param {core.editor.Editor} editor
	 */
	constructor( editor ) {
		/**
		 * @protected
		 * @member {core.editor.Editor} core.PluginCollection#_editor
		 */
		this._editor = editor;

		/**
		 * @protected
		 * @member {Map} core.PluginCollection#_plugins
		 */
		this._plugins = new Map();
	}

	/**
	 * Collection iterator. Returns `[ PluginConstructor, pluginInstance ]` pairs.
	 */
	[ Symbol.iterator ]() {
		return this._plugins[ Symbol.iterator ]();
	}

	/**
	 * Gets the plugin instance by its constructor.
	 *
	 * @param {Function} key The plugin constructor.
	 * @returns {core.Plugin}
	 */
	get( key ) {
		return this._plugins.get( key );
	}

	/**
	 * Loads a set of plugins and add them to the collection.
	 *
	 * @param {Function[]} plugins An array of {@link core.Plugin plugin constructors}.
	 * @returns {Promise} A promise which gets resolved once all plugins are loaded and available into the
	 * collection.
	 * @param {core.Plugin[]} returns.loadedPlugins The array of loaded plugins.
	 */
	load( plugins ) {
		const that = this;
		const editor = this._editor;
		const loading = new Set();
		const loaded = [];

		return Promise.all( plugins.map( loadPlugin ) )
			.then( () => loaded );

		function loadPlugin( PluginConstructor ) {
			// The plugin is already loaded or being loaded - do nothing.
			if ( that.get( PluginConstructor ) || loading.has( PluginConstructor ) ) {
				return;
			}

			return instantiatePlugin( PluginConstructor )
				.catch( ( err ) => {
					/**
					 * It was not possible to load the plugin.
					 *
					 * @error plugincollection-load
					 * @param {String} plugin The name of the plugin that could not be loaded.
					 */
					log.error( 'plugincollection-load: It was not possible to load the plugin.', { plugin: PluginConstructor } );

					throw err;
				} );
		}

		function instantiatePlugin( PluginConstructor ) {
			return new Promise( ( resolve ) => {
				loading.add( PluginConstructor );

				assertIsPlugin( PluginConstructor );

				if ( PluginConstructor.requires ) {
					PluginConstructor.requires.forEach( loadPlugin );
				}

				const plugin = new PluginConstructor( editor );
				that._add( PluginConstructor, plugin );
				loaded.push( plugin );

				resolve();
			} );
		}

		function assertIsPlugin( PluginConstructor ) {
			if ( !( PluginConstructor.prototype instanceof Plugin ) ) {
				/**
				 * The loaded plugin module is not an instance of Plugin.
				 *
				 * @error plugincollection-instance
				 * @param {*} plugin The constructor which is meant to be loaded as a plugin.
				 */
				throw new CKEditorError(
					'plugincollection-instance: The loaded plugin module is not an instance of Plugin.',
					{ plugin: PluginConstructor }
				);
			}
		}
	}

	/**
	 * Adds the plugin to the collection. Exposed mainly for testing purposes.
	 *
	 * @protected
	 * @param {Function} key The plugin constructor.
	 * @param {core.Plugin} plugin The instance of the plugin.
	 */
	_add( key, plugin ) {
		this._plugins.set( key, plugin );
	}
}