# Starts CRO Compare (site + API) at http://127.0.0.1:8091
Set-Location "$PSScriptRoot\pb"
Start-Process "http://127.0.0.1:8091"
.\pocketbase.exe serve --http=127.0.0.1:8091 --dir=pb_data
