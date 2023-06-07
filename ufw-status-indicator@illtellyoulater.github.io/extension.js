'use strict';
const { GObject, GLib, St, Gio, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

// For compatibility checks, as described https://wiki.gnome.org/Attic/GnomeShell/Extensions/Writing
// const Config = imports.misc.config;
// const SHELL_MINOR = parseInt(Config.PACKAGE_VERSION.split('.')[1]);

var ufwStatusIndicator;

const UfwStatusMenuItem = GObject.registerClass(
  class UfwStatusMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(iconName, toolTip) {
      super._init();
      this._icon = new St.Icon({ 
        // St = Shell Toolkit
        x_expand: true, 
        icon_name: 'dialog-question-symbolic',
        style_class: 'system-status-icon',
      });
      this.actor.add_child(this._icon);
      this._label = new St.Label({ 
        x_expand: true, 
        y_align: Clutter.ActorAlign.CENTER 
      });
      this.actor.add_child(this._label);	
    }
  }
);
  
const UfwStatusIndicator = GObject.registerClass(
  class UfwStatusIndicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, "UFW Status Indicator");
      this._icon = new St.Icon({
        icon_name: 'security-low-symbolic',
        style_class: 'system-status-icon',
      });
      this.actor.add_child(this._icon);
      this._menuItem = new UfwStatusMenuItem('security-low-symbolic', 'futureToolTip');
      this.menu.addMenuItem(this._menuItem);
      this._file = Gio.File.new_for_path('/var/log/ufw-status-indicator.ext.log');
      this._monitor = this._file.monitor_file(Gio.FileMonitorFlags.NONE, null);
      // connects the monitor for changed files to this extension
      this._changedFileSignalId = this._monitor.connect('changed', this._refresh.bind(this));
      this._refresh();
    }    
    
    _refresh() {
      let ufwStatus = this._getUfwStatusFromFile();
      if (ufwStatus === 'Status: active') {
        this._icon.icon_name = 'security-high-symbolic';
        this._icon.set_style('color: green');
        this._menuItem._icon.icon_name = 'security-high-symbolic';
        this._menuItem._icon.set_style('color: green');
        this._menuItem._label.set_text('UFW firewall enabled');
      } else if (ufwStatus === 'Status: inactive') {
        this._icon.icon_name = 'security-low-symbolic';
        this._icon.set_style('color: red');
        this._menuItem._icon.icon_name = 'security-low-symbolic';
        this._menuItem._icon.set_style('color: red');
        this._menuItem._label.set_text('UFW firewall disabled');
      } else {
        this._icon.icon_name = 'security-low-symbolic';
        this._icon.set_style('color: orange');
        this._menuItem._icon.icon_name = 'security-low-symbolic';
        this._menuItem._icon.set_style('color: orange');
        // Main.notify('UFW Firewall Indicator Setup', 'Click for more info! ');
        this._menuItem._label.set_text(
          '[ * Welcome to the UFW Indicator Setup! * ]\n'
          + '\n'
          + 'Before the indicator can work we need to setup a simple cron job  \n' 
          + 'which will run \'ufw status\' once per minute copying its output  \n' 
          + 'to "/var/log/ufw-status-indicator.ext.log" so that this extension \n'
          + 'will be able to parse it without directly requiring root access.  \n'
          + '\n'
          + 'To proceed with this task please open up a shell window and type: \n'
          + '\n'
          + 'sudo crontab -e \n'
          + '\n'
          + 'and then add this line to the crontab file making sure to save it:\n'
          + '\n'
          +	'* * * * * LC_ALL=C LANGUAGE=C LANG=C ufw status | grep "Status:" >  '
          + '/var/log/ufw-status-indicator.ext.log\n'
          + '\n'
          + 'Within a min the indicator will start working as expected, enjoy! \n'
          + '\n'
          + '--------------\n'
          + '\n'
          + 'Debug area (ignore this if you haven\'t set the cron job just yet)\n' 
          + 'Value returned when reading the UWF status or errors thrown if any\n'
          + ufwStatus
        );
      }
    }
      
    _getUfwStatusFromFile() {
      try {
        let [res, out] = GLib.file_get_contents('/var/log/ufw-status-indicator.ext.log');
        return imports.byteArray.toString(out).trim(); 
      } catch (e) {
        log('Failed to read ufw-status-indicator.ext.log');
        logError(e, 'ExtensionError');
        return(e)
      }			
    }
      
    _onDestroy() {
      // Disconnect the 'changed' signal from the file monitor
      this._monitor.disconnect(this._changedFileSignalId);		
      super._onDestroy();
    }
  }
);
    
    
function init() {
  if (!ufwStatusIndicator) {
    log('UFW Status Indicator: init() called');
  }
}
    
function enable() {
  log('UFW Status Indicator: enable() called');
  if (ufwStatusIndicator === undefined) {
    ufwStatusIndicator = new UfwStatusIndicator();
    Main.panel.addToStatusArea('UFW Status Indicator', ufwStatusIndicator);
  }
}
    
function disable() {
  log('UFW Status Indicator: disable() called');
  ufwStatusIndicator.destroy();
  log(ufwStatusIndicator);
  ufwStatusIndicator = undefined;
}
    
