Pod::Spec.new do |s|

  s.name = 'FeatureApi'
  s.version = '1.5.2'
  s.summary = 'Swagger client for FeatureApi'


  s.description = <<-DESC
Swagger client for FeatureApi version 1.5.2
                  DESC

  s.homepage = 'https://github.com/gas-buddy/gasbuddy-ios'

  s.author = { 'GasBuddy' => 'info@gasbuddy.com' }
  s.source = { :git => 'https://github.com/gas-buddy/gasbuddy-ios', :tag => s.version.to_s }

  s.ios.deployment_target = '10.0'
  s.osx.deployment_target = '10.10'
  s.watchos.deployment_target = '5.0'

  s.source_files = 'FeatureApi.swift'
  s.dependency 'SwaggerClientSupport'
end
