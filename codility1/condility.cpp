// condility.cpp : Defines the entry point for the console application.
//
#include <Windows.h>
#include <tchar.h>
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <exception>
#include <iterator>
#include <bitset>
#include <sstream>
#include <string.h>

#include <boost/format.hpp>

#define SECURITY_WIN32
#include <security.h>
#pragma comment(lib, "secur32.lib")

std::wstring get_system_user_name()
{
	std::wstring result;
	const size_t initial_buf_size = 128;
	std::vector<wchar_t> buffer(initial_buf_size, 0);
	ULONG char_count = static_cast<ULONG>(buffer.size() - 1);
	const EXTENDED_NAME_FORMAT fmt = NameSamCompatible;
	if (!GetUserNameEx(fmt, &buffer[0], &char_count) && ERROR_MORE_DATA == ::GetLastError() && char_count > 0)
	{
		buffer.resize(char_count + 1, 0);
		if (!GetUserNameEx(fmt, &buffer[0], &char_count))
			return L"";
	}
		
	if (char_count > 0)
		result = &buffer[0];

	return result;
}

namespace ml
{
	template <typename _StringType, typename _OutputIterator, typename _SepsStringType>
	inline _OutputIterator tokenize(const _StringType &src, _OutputIterator output, const _SepsStringType &seps)
	{
		typedef _StringType::size_type pos_type;

		pos_type pos1 = src.find_first_not_of(seps);

		while (pos1 != _StringType::npos)
		{
			pos_type pos2 = src.find_first_of(seps, pos1);
			*output++ = src.substr(pos1, pos2 != _StringType::npos ? pos2 - pos1 : _StringType::npos);
			if (pos2 == _StringType::npos)
				break;
			pos1 = src.find_first_not_of(seps, pos2);
		}
		return output;
	}
}

std::vector<std::wstring> get_command_line()
{
	std::wstring cmd_line = GetCommandLine();
	std::vector<std::wstring> result;

	ml::tokenize(cmd_line, std::back_inserter(result), L" \t");
	return result;
}

std::vector<std::wstring> split(const std::wstring& s)
{
	std::vector<std::wstring> res;
	typedef std::vector<std::wstring>::const_iterator vstr_iterator;

	size_t start(0), count(0), i(0);

	do 
	{
		i = s.find(L'|', start);
		count = i == std::wstring::npos ? i : i - start;
		std::wstring tmp = s.substr(start, count);
		if (!tmp.empty())
			res.push_back(tmp);

		start = s.find_first_not_of(L'|', i);

	} while (start != std::wstring::npos);

	return res;
}

int str2int(const std::wstring& val)
{
	std::wistringstream istr(val);
	int result = int();
	istr >> result;
	return result;
}


std::wstring get_command_param(const std::wstring& param)
{
	std::wstring result;

	if (param.empty())
		return result;

	std::wstring s_param(param);
	if (param[0] != L' ')
		s_param.insert(0, 1,  L' ');

	const size_t str_end = std::wstring::npos;
	std::wstring cmd_line = GetCommandLine();
	size_t start_pos = cmd_line.find(s_param, 0);
	
	if (start_pos == str_end)
		return result;

	size_t value_start_pos = start_pos + s_param.size();
	size_t value_end_pos = cmd_line.find_first_of(L" \t", value_start_pos + 1);
	size_t value_length = (value_end_pos == str_end) ? cmd_line.length() - value_start_pos : value_end_pos - value_start_pos;

	result = cmd_line.substr(value_start_pos, value_length);
	
	return result;
}

boost::wformat  my_fmt(const std::wstring & f_string) 
{
	using namespace boost::io;
	boost::wformat fmter(f_string);
	fmter.exceptions(all_error_bits ^ (too_many_args_bit | too_few_args_bit));
	return fmter;
}

std::wstring __cdecl generic_format(const std::wstring& fmt, const std::vector<std::wstring>& data)
{
	using namespace boost::io;
	boost::wformat formatter(fmt);
	formatter.exceptions(all_error_bits ^ (too_many_args_bit | too_few_args_bit));

	return L"";
}

int _tmain(int argc, _TCHAR* argv[])
{
	std::wstring par1 = L"PARAM1";
	std::wstring par2 = L"PARAM2";

	std::wstring f1 = L" Format with %1% parameter";
	std::wstring f2 = L" Format without parameters";
	std::wstring f3 = L" Format with %1% and %2% parameters";
	std::wstring f4 = L" Format with second %2% parameter";

	std::wstring f5 = L" Format with %s parameter";
	std::wstring f6 = L" Format with %s and %s parameter";

	std::wstring res;

	res = (my_fmt(f1) % par1).str();
	res = (my_fmt(f2) % par1).str();
	res = (my_fmt(f3) % par1).str();
	res = (my_fmt(f4) % par1 % par2).str();

	boost::wformat fmter = my_fmt(f6);

	std::wostringstream ostr;
	ostr << L"P11 P11\n";
	ostr << L"P22 P22";

	std::wistringstream istr(ostr.str());
	istr >> par1;
	istr >> par2;
	
	
	return 0;
}

