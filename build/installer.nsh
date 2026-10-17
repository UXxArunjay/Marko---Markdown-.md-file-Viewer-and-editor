!macro customInstall
  DetailPrint "Registering Marko File Associations and Open With capabilities..."

  WriteRegStr HKCU "Software\Classes\Applications\Marko.exe" "" "Marko - Markdown Viewer and Editor"
  WriteRegStr HKCU "Software\Classes\Applications\Marko.exe" "FriendlyAppName" "Marko"
  WriteRegStr HKCU "Software\Classes\Applications\Marko.exe" "ApplicationDescription" "Universal Markdown Viewer and Editor"
  WriteRegStr HKCU "Software\Classes\Applications\Marko.exe\DefaultIcon" "" "$appExe,0"
  WriteRegStr HKCU "Software\Classes\Applications\Marko.exe\shell\open\command" "" '"$appExe" "%1"'
  WriteRegStr HKCU "Software\Classes\Applications\Marko.exe\SupportedTypes" ".md" ""
  WriteRegStr HKCU "Software\Classes\Applications\Marko.exe\SupportedTypes" ".markdown" ""

  WriteRegStr HKCU "Software\Classes\Marko.md" "" "Markdown Document"
  WriteRegStr HKCU "Software\Classes\Marko.md" "FriendlyTypeName" "Markdown Document"
  WriteRegStr HKCU "Software\Classes\Marko.md\DefaultIcon" "" "$appExe,0"
  WriteRegStr HKCU "Software\Classes\Marko.md\shell\open\command" "" '"$appExe" "%1"'

  WriteRegStr HKCU "Software\Classes\.md\OpenWithProgids" "Marko.md" ""
  WriteRegStr HKCU "Software\Classes\.markdown\OpenWithProgids" "Marko.md" ""
  WriteRegStr HKCU "Software\Classes\.md\OpenWithList\Marko.exe" "" ""
  WriteRegStr HKCU "Software\Classes\.markdown\OpenWithList\Marko.exe" "" ""

  WriteRegStr HKCU "Software\Marko\Capabilities" "ApplicationName" "Marko"
  WriteRegStr HKCU "Software\Marko\Capabilities" "ApplicationDescription" "Universal Markdown Viewer and Editor"
  WriteRegStr HKCU "Software\Marko\Capabilities\FileAssociations" ".md" "Marko.md"
  WriteRegStr HKCU "Software\Marko\Capabilities\FileAssociations" ".markdown" "Marko.md"
  WriteRegStr HKCU "Software\RegisteredApplications" "Marko" "Software\Marko\Capabilities"

  ; Notify Windows shell of association changes
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Applications\Marko.exe"
  DeleteRegKey HKCU "Software\Classes\Marko.md"
  DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "Marko.md"
  DeleteRegValue HKCU "Software\Classes\.markdown\OpenWithProgids" "Marko.md"
  DeleteRegKey HKCU "Software\Classes\.md\OpenWithList\Marko.exe"
  DeleteRegKey HKCU "Software\Classes\.markdown\OpenWithList\Marko.exe"
  DeleteRegKey HKCU "Software\Marko"
  DeleteRegValue HKCU "Software\RegisteredApplications" "Marko"

  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
