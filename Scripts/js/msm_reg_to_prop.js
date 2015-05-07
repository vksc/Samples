var pretty_print_ism = true;
var configurable_properties = 
[
	"SuppressSyncIssues",
	"EnablePeriodicUpstreamSync",
	"MaxShortcutAgeEnabled",
	"MaxShortcutAge",
	"ProgressFormAutoshow",
	"HTTPClient_ConnectTimeout",
	"HTTPClient_ReceiveTimeout",
	"HTTPClient_SendTimeout",
	"HTTPClient_SendRetryCount", 
	"MicroSchedTask_PeriodicSyncUpstream_Enabled", 	// settings migration draft
	"MicroSchedTask_PeriodicSync_Enabled",	// settings migration draft
	"ProxyUsage",			// settings migration draft
	"ProxyServerPort",		// settings migration draft
	"ProxyServer",			// settings migration draft
	"ProxyPassword",		// settings migration draft
	"ProxyLogin",			// settings migration draft
	"SyncPeriod",			// settings migration draft
	"SyncPeriodUpstream"	// settings migration draft
];

function get_column_index(table_node, col_name)
{
	var q = format("col[text()='%0%']", [col_name]);
	var this_nodes = table_node.selectNodes(q);
	if (!this_nodes || this_nodes.length == 0)
		return -1;	
	
	var q = format("col[text()='%0%']/preceding-sibling::*", [col_name]);
	var nodelist = table_node.selectNodes(q);
	return ((nodelist) ? nodelist.length : 0) + 1;
}

function reg_name_to_prop_name(regname, prefix)
{
	var re_ws = /(\s+)/g;
	var res = regname.replace(re_ws, '_');
	
	var re_nws = /(:+)/g;
	res = regname.replace(re_nws, '_');
		
	if (prefix)
		res = prefix+res;
	
	return res;
}

function replace_all(repl_what, repl_with, str)
{
	var result = str;
	while (true)
	{
		var old_r = result;
		result = result.replace(repl_what, repl_with);
		if (result == old_r)
			break;
	}
	return result;
}

function format(templ, values)
{
	for (var key in values)
		templ = replace_all("%" + key + "%", values[key], templ);
	return templ;
}

function parse_reg_value(val)
{
	var re = new RegExp("^(#[x,#]?)?(.*)", "i");
	var res = re.exec(val);
	
	reg_value = 
	{
		formatter: res[1],
		value: res[2]
	};
	
	return reg_value;
}

function value_formatted(value)
{
	var rx = /(\[[^~].*\])/i;
	res = rx.test(value);
	return res;
}

function get_col_value(row, name)
{
	var query = format("td[%0%]", [get_column_index(row.parentNode, name)]);
	var td = row.selectSingleNode(query);
	return td.text;
}

function set_col_value(table, row, name, value)
{
	var query = format("td[%0%]", [get_column_index(table, name)]);
	var td = row.selectSingleNode(query);
	td.text = value;
}

function get_module_id(xml)
{
	var q = "/msi/table[@name='ModuleSignature']/row/td[1]";
	var sig = xml.selectSingleNode(q);
	if (!sig)
		return null;
	
	var arr = sig.text.split(".");
	if (arr && arr.length > 1)
		return arr[arr.length-1];
	
	return null;
}

function get_qualified_propname(xml, propname)
{
	var moduleid = get_module_id(xml);
	return (moduleid) ? propname + "." + moduleid : propname;
}

function add_property(proptable, propname, value)
{
	var row = proptable.ownerDocument.createNode(1, "row", "");
	var prop_columns = proptable.selectNodes('col');
	var tds = new Array();
	
	for (var i = 0; i < prop_columns.length; ++i)
		row.appendChild(proptable.ownerDocument.createNode(1, "td", ""));

	set_col_value(proptable, row, "Property", propname);
	set_col_value(proptable, row, "Value", value);
	proptable.appendChild(row);
}

function prop_exists(table, propname)
{
	var reg_query = "row/td[%0%][text()='%1%']"
	var cpos = get_column_index(table, "Property");
	reg_query = format(reg_query, [cpos, propname]);
	var pn = table.selectSingleNode(reg_query);
	return pn != null;
}

function configurable_property(name)
{
	if (!configurable_properties)
		return true;
	
	for (var n in configurable_properties)
	{
		if (configurable_properties[n] == name)
			return true;
	}
	
	return false;
}

function generate_props(regtable, proptable, key, prefix)
{
	var reg_query = "row[td[%0%][text()='%1%']]"
	var key_idx = get_column_index(regtable, "Key");
	reg_query = format(reg_query, [key_idx, key]);	
	
	var reg_rows = regtable.selectNodes(reg_query);

	for (var i = 0; i < reg_rows.length; ++i)
	{
		var keyname = get_col_value(reg_rows[i], "Name").replace(" ", "");
		
		if (keyname == "*")
			continue;
		
		var keyvalue = 	parse_reg_value(get_col_value(reg_rows[i], "Value"));
		
		//if (keyvalue.formatter != "#") // this condition will skip non-DWORD registry keys
			//continue;
		
		if (value_formatted(keyvalue.value))
			continue;
					
		var propname = reg_name_to_prop_name(keyname, prefix);
		
		if (!configurable_property(propname))
			continue;
		
		propname = get_qualified_propname(proptable.ownerDocument, propname);

		if (!prop_exists(proptable, propname))
			add_property(proptable, propname, keyvalue.value);

		keyvalue.value = "[" + propname + "]";			
		set_col_value(regtable, reg_rows[i], "Value", keyvalue.formatter + keyvalue.value);
	}
}

function beast2beauty(ism_path)
{
	var ishield = new ActiveXObject('ISWiAuto15.ISWiProject');	
	ishield.OpenProject(ism_path, true);
	ishield.SaveProject();	
}

function customize_installer(ism_path, root_registry_node_name)
{
	var xml = new ActiveXObject("Msxml2.FreeThreadedDOMDocument");
	xml.async = false;
	xml.preserveWhiteSpace = true;
	xml.setProperty("SelectionLanguage", "XPath");
	xml.load(ism_path);

	var regtable_query = "/msi/table[@name='Registry']";
	var regtable_node = xml.selectSingleNode(regtable_query);

	var proptable_query = "/msi/table[@name='Property']";
	var proptable_node = xml.selectSingleNode(proptable_query);

	generate_props(regtable_node, proptable_node, root_registry_node_name, "");
	// generate_props(regtable_node, proptable_node, root_registry_node_name + "\\Logging\\ExceptionLog", "ExceptionLog_");
	// generate_props(regtable_node, proptable_node, root_registry_node_name + "\\Logging\\GeneralLog", "GeneralLog_");
	// generate_props(regtable_node, proptable_node, root_registry_node_name + "\\Logging\\SoapDump", "SoapDump_");
	// generate_props(regtable_node, proptable_node, root_registry_node_name + "\\Logging\\SyncDump", "SyncDump_");
	// generate_props(regtable_node, proptable_node, root_registry_node_name + "\\Logging\\CrashDump", "CrashDump_");

	xml.save(ism_path);
	
	//// Reopen ism with IShield to reformat
	if (pretty_print_ism)
		beast2beauty(ism_path);
}

function customize_folder()
{
	var path = "D:\\SalesX\\Common\\Platforms\\SD3\\folder\\install\\SD3Folder.ism";
	var root_node = "[FOLDER_PRODUCT_REGISTRY_NODE]";
	customize_installer(path, root_node);
}

function customize_outlook()
{
	var path = "D:\\SalesX\\Common\\Platforms\\SD3\\outlook\\installer\\SD3Outlook.ism";
	var root_node = "[SD3_PRODUCT_REGISTRY_NODE]";
	customize_installer(path, root_node);
}

function customize_lotus()
{
	var path = "D:\\SalesX\\Common\\Platforms\\SD3\\lotus_notes\\installer\\SD3LotusNotes.ism";
	var root_node = "[SD3_PRODUCT_REGISTRY_NODE]";
	customize_installer(path, root_node);
}

var objArgs = WScript.Arguments.Unnamed;
if (objArgs)
{
	eval(objArgs.Item(0) + "();");
}
