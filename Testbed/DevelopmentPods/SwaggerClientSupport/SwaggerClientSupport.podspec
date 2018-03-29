Pod::Spec.new do |s|

  s.name = 'SwaggerClientSupport'
  s.version = '1.0.0'
  s.summary = 'Support functionality for GasBuddy Swagger APIs'

  s.description = <<-DESC
Support functionality for GasBuddy Swagger APIs 
                  DESC

  s.homepage = 'https://github.com/gas-buddy/gasbuddy-ios'

  s.author = { 'GasBuddy' => 'info@gasbuddy.com' }
  s.source = { :git => 'https://github.com/gas-buddy/gasbuddy-ios', :tag => s.version.to_s }

  s.ios.deployment_target = '9.0'
  s.osx.deployment_target = '10.10'

  s.dependency 'Alamofire'
  s.source_files = '*.swift'
end
