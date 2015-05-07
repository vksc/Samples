set wscript_exe="wscript.exe"
if exist "%systemroot%\syswow64" set wscript_exe="%systemroot%\syswow64\wscript.exe"

%wscript_exe% /D msm_reg_to_prop.js customize_folder
%wscript_exe% /D msm_reg_to_prop.js customize_outlook
%wscript_exe% /D msm_reg_to_prop.js customize_lotus
