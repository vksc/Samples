/*
	Usage: 
	cscript <path_to_msi_stub.js> /msi:<path_to_msi> [/force_remove_related:Y/N] [/i:<install options>]
	/msi:<path_to_msi>  - path to installation package, use quotes if path contains spaces. Required.
	/i:<install options> - msiexec options for the first-time installation, do not include path to installation package here. Default is '/qn REBOOT=ReallySuppress REBOOTPROMPT=S'. Optional.
	/force_remove_related:Y/N - reserved for future releases. Default is 'Y'. Optional.
	
	Samples:
	* cscript msi_stub.js /msi:"SalesDesktop for SAP.msi"
	* cscript msi_stub.js /msi:"SalesDesktop for SAP.msi" /i:"TRANSFORMS=CMP-SalesDesktop-for-SAP.mst /passive /norestart /l*v C:\Temp\iCRM-logging_CMP_r75.log"
*/

var common_maintenance_options = "REBOOT=ReallySuppress REBOOTPROMPT=S";
var minor_upgrade_options = "/qn REINSTALLMODE=voums REINSTALL=ALL " + common_maintenance_options;
var InstallState =
{
	Unknown      : -1,  // The product is neither advertised or installed.	
	InvalidArg   : -2,  // invalid function argument
	Advertised   :  1,  // The product is advertised but not installed.
	Absent       :  2,  // The product is installed for a different user.
	Default      :  5   // The product is installed for the current user.
};

msiOpenDatabaseMode = { ReadOnly : 0 }; // Just for convenient naming. Other modes are not listed 'coz are not used here.


function log(txt)
{	
	//WScript.Echo(txt); // comment this line to disable console output
}

function get_msi()
{
	var msi = new ActiveXObject("WindowsInstaller.Installer");
	msi.UILevel = 2;
	return msi;
}

function quote(src)
{
	return '\"' + src + '\"';
}

function msiexec(mode, msi_path, params)
{
	var arr_cmd = new Array();
	arr_cmd.push("msiexec");
	arr_cmd.push(mode);
	arr_cmd.push(quote(msi_path));
	arr_cmd.push(params);
	var cmd = arr_cmd.join(' ');

	log("Run msi with command line: \n" + cmd);
	
	var shell = new ActiveXObject("WScript.Shell");
	var exec = shell.Exec(cmd);

	while(exec.Status == 0)
	{
		WScript.Sleep(100);
	}

	log("Exit status " + exec.Status);
}

function get_product_property(msidb, propname)
{
	var sql = "select * from Property where Property.Property = " + "\'" + propname + "\'";
	var view = msidb.OpenView(sql);
	if (view == null)
		return null;
	
	view.Execute(null);

	var recs = new Array();
	var rec = view.Fetch();
	return (rec == null) ? null : rec.StringData(2);
}

function get_product_info(package_path)
{
	var msi = get_msi();
	var db = msi.OpenDatabase(package_path, msiOpenDatabaseMode.ReadOnly);
	
	var prod_code = get_product_property(db, "ProductCode");
	var upgrade_code = get_product_property(db, "UpgradeCode");
	var related_stringlist = msi.RelatedProducts(upgrade_code);
	var rel_array = new Array;
	
	var r_cnt = related_stringlist.Count;
	for (var i = 0; i < r_cnt; ++i)
	{	rel_array.push(related_stringlist.Item(i)); }
	
	product_info = 
	{
		product_code : prod_code,
		state : msi.ProductState(prod_code),
		related: rel_array
	}
	
	return product_info;
}

var msi_path = WSH.Arguments.Named.Item("msi");
var cmd_install = WSH.Arguments.Named.Item("i") || ("/qn " + common_maintenance_options);
var cmd_major_upgrade = WSH.Arguments.Named.Item("force_remove_related");
var force_remove_related = (!cmd_major_upgrade || (cmd_major_upgrade.toUpperCase() != 'N'));
var product_info = get_product_info(msi_path);
var install_options = cmd_install;

if (product_info.state == InstallState.Default)
{
	log("The product is already installed, setup will run in upgrade mode.");
	install_options = minor_upgrade_options;
}

if (force_remove_related && product_info.related)
{
	log("Check related products...")
	for (var i in product_info.related)
	{
		if (product_info.related[i] != product_info.product_code)
			get_msi().ConfigureProduct(product_info.related[i], 0, InstallState.Absent);
	}
}

msiexec("/i", msi_path, install_options);