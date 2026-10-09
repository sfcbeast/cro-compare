# Publishes pb/pb_public to the gh-pages branch (GitHub Pages serves it).
Set-Location $PSScriptRoot
git subtree split --prefix=pb/pb_public -b gh-pages-tmp | Out-Null
git push -f origin gh-pages-tmp:gh-pages
git branch -D gh-pages-tmp | Out-Null
