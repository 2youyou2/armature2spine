Converts 1.3 armature to 3.4 spine

# install

 - git clone https://github.com/2youyou2/armature2spine
 - cd armature2spine
 - npm install
 
# usage


```javascript
node ./a2s.js --help
```

```javascript

// # Search files with pattern **/Json/*.json
node ./a2s.js --src /Users/youyou/Desktop/cca

// # Specify the export path
node ./a2s.js --src /Users/youyou/Desktop/cca --dst /Users/youyou/Desktop/cca/spine
```

# import data in spine
(1.) export directory will like:
- cca
 - cca.json
 - images

(2.) select menu in spine:
- spine
 - import data
  
(3.) select json data (cca.json) and import

(4.) save spine project in the same directory with cca.json

(5.) enjoy spine!

 
