#include "stdafx.h"

#include <vector>
#include <string>
#include <memory>
#include <Psapi.h>
#include <TlHelp32.h>
#include <Shlwapi.h>
#include <Msi.h>
#include <Msiquery.h>

#pragma comment(lib, "Msi.lib")
#pragma comment(lib, "shlwapi.lib")

namespace
{
	struct shutdown_helper
	{
		DWORD	process_id;
		HWND	hwnd;
	};

	std::wstring get_process_path(HANDLE h)
	{
		DWORD dwBuffSize = 1;
		std::vector <wchar_t> buf;
		std::wstring result;
		DWORD dwErr = 0;
		do
		{
			dwBuffSize += MAX_PATH;
			buf.resize(dwBuffSize, 0);
			dwBuffSize = ::GetModuleFileNameEx(h, 0, &buf[0], dwBuffSize);
		} while (ERROR_INSUFFICIENT_BUFFER == (dwErr = ::GetLastError()));

		if (0 != dwBuffSize)
			result = (wchar_t*)&buf[0];

		return result;
	}

	BOOL CALLBACK process_window_enum(HWND hwnd, LPARAM lParam)
	{
		DWORD proc_id(0);
		shutdown_helper * const pThis = reinterpret_cast<shutdown_helper*>(lParam);

		if (!pThis)
			return FALSE;

		::GetWindowThreadProcessId(hwnd, &proc_id);

		if (proc_id != pThis->process_id)
			return TRUE;

		pThis->hwnd = hwnd;
		return FALSE;
	}

	DWORD find_process(const std::wstring& exe_name)
	{
		PROCESSENTRY32 entry;
		entry.dwSize = sizeof(PROCESSENTRY32);

		HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, NULL);
		DWORD proc_id = 0;

		__try
		{
			if (Process32First(snapshot, &entry) == TRUE)
			{
				while (Process32Next(snapshot, &entry) == TRUE)
				{
					if (StrCmpI(exe_name.c_str(), entry.szExeFile) == 0)
					{
						proc_id = entry.th32ProcessID;
						break;
					}
				}
			}
		}
		__finally
		{
			::CloseHandle(snapshot);
		}

		return proc_id;
	}

	bool is_valid_process_handle(HANDLE hProcess)
	{
		return hProcess && hProcess != INVALID_HANDLE_VALUE;
	}

	bool is_active_process(HANDLE hProcess, DWORD wait_timeout)
	{
		if (!(is_valid_process_handle(hProcess)))
			return false;

		DWORD dwWait = ::WaitForSingleObject(hProcess, wait_timeout);
		DWORD dwErr = GetLastError();
		
		return (WAIT_TIMEOUT == dwWait);
	}

	UINT shutdown_app_impl(const std::wstring& path)
	{
		shutdown_helper sd_helper;
		sd_helper.process_id = find_process(path);

		DWORD wait_timeout = 20000;

		if (sd_helper.process_id)
		{
			::EnumWindows(process_window_enum, reinterpret_cast<LPARAM>(&sd_helper));
			
			if (::IsWindow(sd_helper.hwnd))
			{
				DWORD dwRes = 0;
				if (::SendMessage(sd_helper.hwnd, WM_QUERYENDSESSION, 0, ENDSESSION_CLOSEAPP))
					::SendMessageTimeout(sd_helper.hwnd, WM_ENDSESSION, TRUE, ENDSESSION_CLOSEAPP, SMTO_ABORTIFHUNG, wait_timeout, &dwRes);
			}
		}

		HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_TERMINATE | SYNCHRONIZE, FALSE, sd_helper.process_id);

		__try
		{
			if (is_active_process(hProcess, wait_timeout))
			{
				DWORD dwRes(0);
				::SendMessageTimeout(sd_helper.hwnd, WM_CLOSE, 0, 0, SMTO_ABORTIFHUNG, wait_timeout, &dwRes);
			}

			if (is_active_process(hProcess, wait_timeout))
				TerminateProcess(hProcess, -1);
		}
		__finally
		{ 
			if (is_valid_process_handle(hProcess))
				::CloseHandle(hProcess);
		}

		
		return ERROR_SUCCESS;

	}
}


UINT shutdown_app(const std::wstring& path)
{
	UINT uiRes(0);
	try
	{
		uiRes = shutdown_app_impl(path);
	}
	catch (...)
	{
		uiRes = ERROR_INSTALL_FAILURE;
	}

	return uiRes;
}

